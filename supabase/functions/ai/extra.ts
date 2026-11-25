// Newer AI features. Each mode returns JSON, or null when the mode is not one of these.
// Kept apart from index.ts so the main endpoint stays small. Same model and key as index.ts.
/** Which weekly limit each mode counts against (see FREE_LIMITS in index.ts). */
export const EXTRA_KINDS: Record<string, 'scans' | 'recipes' | 'bitey' | 'live'> = {
  live: 'live', text: 'scans', menu: 'scans', coach: 'bitey', fridge: 'recipes', import: 'recipes', plan: 'recipes', lighten: 'recipes',
};

type Ask = (content: unknown[], schema: object) => Promise<unknown>;

const num = { type: 'number' };
const str = { type: 'string' };
const obj = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const list = (items: unknown) => ({ type: 'array', items });

const ITEM = obj({ name: str, grams: num, kcal: num, protein: num, carbs: num, fat: num });
const MEAL = obj({ meal_name: str, items: list(ITEM), confidence: { type: 'string', enum: ['low', 'medium', 'high'] }, notes: str });
const CAT = { type: 'string', enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'] };
const TAGS = list({ type: 'string', enum: ['High protein', 'Under 400', 'Low carb', 'Vegetarian', 'Vegan', 'Meal prep', 'No cook'] });
const RECIPE = obj({ title: str, cat: CAT, min: num, serv: num, kcal: num, p: num, c: num, f: num, tags: TAGS, ing: list(str), steps: list(str) });

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const image = (b: Record<string, unknown>) => {
  if (typeof b.imageBase64 !== 'string' || !b.imageBase64) throw new Error('Send a photo.');
  const media_type = IMAGE_TYPES.includes(String(b.mediaType)) ? String(b.mediaType) : 'image/jpeg';
  return { type: 'image', source: { type: 'base64', media_type, data: b.imageBase64 } };
};
const text = (t: string) => ({ type: 'text', text: t });
const clip = (v: unknown, n: number) => String(v ?? '').slice(0, n).trim();
const n0 = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

export async function handleExtra(body: Record<string, unknown>, ask: Ask): Promise<unknown | null> {
  switch (body.mode) {
    // Live camera: a quick guess from a small, blurry preview frame.
    case 'live':
      return ask([image(body), text('This is a live camera preview frame in a calorie-tracking app. If food is visible, name the dish in 2 to 4 words and give one realistic total calorie estimate for what is in frame. If no food is visible, return an empty name and 0.')],
        obj({ name: str, kcal: num }));

    // Voice or typed description of a meal, e.g. "a turkey sandwich and an apple".
    case 'text': {
      const said = clip(body.text, 500);
      if (!said) throw new Error('Say or type what you ate.');
      return ask([text(`A user of a weight-loss app described what they ate: "${said}". Split it into separate foods, assume typical portions unless an amount is given, and estimate grams, calories (kcal), protein, carbs and fat for each. In notes, give one short sentence on any assumption about portion size.`)], MEAL);
    }

    // AI coach: what to eat next with the calories that are left today.
    case 'coach': {
      const left = (body.left ?? {}) as Record<string, unknown>;
      const eaten = Array.isArray(body.eaten) ? body.eaten.slice(0, 20).map((x) => clip(x, 60)).join(', ') : '';
      const meal = clip(body.meal, 20) || 'next meal';
      const prefs = clip(body.prefs, 200);
      return ask([text(`You are a friendly nutrition coach in a weight-loss app. The user has ${n0(left.kcal)} kcal, ${n0(left.p)} g protein, ${n0(left.c)} g carbs and ${n0(left.f)} g fat left today. Eaten so far: ${eaten || 'nothing yet'}. Suggest 3 simple, realistic ideas for their ${meal} that fit what is left, favouring protein and vegetables. ${prefs ? `Preferences: ${prefs}.` : ''} The tip is one encouraging sentence about their day so far. Each "why" is one short sentence.`)],
        obj({ tip: str, ideas: list(obj({ title: str, kcal: num, protein: num, why: str })) }));
    }

    // Fridge or pantry photo: what is there, and 3 healthy recipes from it.
    case 'fridge':
      return ask([image(body), text('This is a photo of a fridge, pantry or ingredients on a counter. List the foods you can clearly see. Then write 3 healthy, realistic recipes for a weight-loss app that use mainly those foods plus basic staples (oil, salt, spices). Use metric amounts. Give calories and macros per serving, with kcal close to 4*protein + 4*carbs + 9*fat. Keep each step to one short sentence.')],
        obj({ ingredients: list(str), recipes: list(RECIPE) }));

    // Restaurant menu photo: rough calories per dish and how well it fits what is left today.
    case 'menu':
      return ask([image(body), text(`This is a photo of a restaurant menu. The diner is losing weight and has ${n0(body.kcalLeft)} kcal left today. For up to 15 dishes you can read, estimate typical restaurant calories and protein for one serving. Mark fit "great" if it fits easily and is filling, "ok" if it fits with care, "heavy" if it would go over or is very rich. The tip is one short, practical sentence (for example: dressing on the side, swap fries for salad).`)],
        obj({ dishes: list(obj({ name: str, kcal: num, protein: num, fit: { type: 'string', enum: ['great', 'ok', 'heavy'] }, tip: str })) }));

    // Recipe link (blog, TikTok, Instagram, YouTube) or pasted text, turned into a Snapspoon recipe.
    case 'import': {
      const source = clip(body.source, 6000);
      if (!source) throw new Error('Paste a recipe link or the recipe text.');
      const page = /^https?:\/\//i.test(source) ? await readPage(source) : source;
      return ask([text(`Turn this into one recipe for a weight-loss app. Keep the dish true to the original, but use metric amounts. Give calories and macros per serving, with kcal close to 4*protein + 4*carbs + 9*fat. Keep each step to one short sentence. If the text has no recipe, make your best guess from the dish name.\n\n<source>\n${page}\n</source>`)], RECIPE);
    }

    // A week of meals that hit the user's calories, with a grocery list by aisle.
    case 'plan': {
      const prefs = clip(body.prefs, 300);
      return ask([text(`Plan 7 days of healthy, simple meals (Breakfast, Lunch, Dinner, Snack) for someone losing weight on about ${n0(body.kcal)} kcal and ${n0(body.protein)} g protein a day. Reuse ingredients across the week to keep shopping small, and repeat leftovers where it makes sense. ${prefs ? `Preferences: ${prefs}.` : ''} Name days Monday to Sunday. Then give one combined grocery list with amounts, grouped by aisle (Produce, Protein, Dairy, Pantry, Frozen, Other).`)],
        obj({ days: list(obj({ day: str, meals: list(obj({ meal: CAT, title: str, kcal: num, protein: num })) })), grocery: list(obj({ aisle: str, items: list(str) })) }));
    }

    // "Make it healthier": a lighter version of a recipe and what changed.
    case 'lighten': {
      const recipe = JSON.stringify(body.recipe ?? {}).slice(0, 4000);
      return ask([text(`Make a lighter, higher-protein version of this recipe for a weight-loss app, keeping it tasty and close to the original. Use smart swaps (for example Greek yogurt for cream, less oil, more vegetables, leaner meat). Give calories and macros per serving, with kcal close to 4*protein + 4*carbs + 9*fat. In swaps, list each change in one short sentence with the calories it saves.\n\n${recipe}`)],
        obj({ ...RECIPE.properties, swaps: list(str) }));
    }
  }
  return null;
}

/** Fetches a public web page and keeps the recipe parts: JSON-LD recipe data, title, description, and visible text. */
async function readPage(url: string) {
  // Only public https sites: no IP addresses or local names, so the server can't be pointed at itself.
  let host = '';
  try { const u = new URL(url); host = u.protocol === 'https:' ? u.hostname : ''; } catch {}
  if (!host || !host.includes('.') || /^[\d.]+$|^\[|localhost|\.local$|\.internal$/i.test(host)) return `A recipe from this link: ${url}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SnapspoonBot/1.0)' }, redirect: 'follow', signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!res || !res.ok) return `A recipe from this link (the page could not be opened): ${url}`;
  const html = (await res.text()).slice(0, 400_000);
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).filter((x) => /Recipe/i.test(x)).join('\n').slice(0, 6000);
  const meta = [...html.matchAll(/<meta[^>]+(?:name|property)="(?:og:title|og:description|description|twitter:description)"[^>]+content="([^"]*)"/gi)].map((m) => m[1]).join('\n');
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '';
  const textOnly = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 6000);
  return [`Link: ${url}`, title, meta, ld, ld ? '' : textOnly].filter(Boolean).join('\n');
}
