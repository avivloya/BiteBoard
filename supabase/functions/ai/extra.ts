// Newer AI features. Each mode returns JSON, or null when the mode is not one of these.
// Kept apart from index.ts so the main endpoint stays small. Same model and key as index.ts.
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
  }
  return null;
}
