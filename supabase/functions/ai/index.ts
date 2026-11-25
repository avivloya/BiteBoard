// Snapspoon AI endpoint (Supabase Edge Function, Deno).
// POST { mode: "meal", imageBase64, mediaType }  -> MealEstimate JSON
// POST { mode: "recipe", prompt }                -> RecipeDraft JSON
// POST { mode: "bitey", messages: [{role, content}] } -> { text } (Bitey, the helper in the Inbox)
// POST { mode: "fix", estimate, correction }      -> MealEstimate JSON (redo a photo estimate from "it was 2 eggs")
// More modes (live camera, voice log, coach, fridge, ...) are in extra.ts.
// Every request needs a signed-in Supabase user (guests count): send "Authorization: Bearer <access token>".
// Free accounts get FREE_LIMITS a week, counted here on the server (table ai_usage), so the limit can't be skipped.
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-... REVENUECAT_SECRET_KEY=sk_...
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are filled in by Supabase automatically.)
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

import { BITEY_GUIDE } from './bitey.ts';
import { EXTRA_KINDS, handleExtra } from './extra.ts';

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
const MODEL = 'claude-opus-5-5';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const RC_KEY = Deno.env.get('REVENUECAT_SECRET_KEY');

/** Uses a week per account. Pro is unlimited for photo scans and recipes; Bitey has a high cap for everyone. */
const FREE_LIMITS = { scans: 3, recipes: 3, fixes: 20, bitey: 50, live: 30 } as const;
const PRO_LIMITS = { scans: 300, recipes: 300, fixes: 300, bitey: 50, live: 400 } as const;
type Kind = keyof typeof FREE_LIMITS;

/** True when RevenueCat says this user has an active "pro" entitlement. The app logs in to RevenueCat with the Supabase user id. */
async function isPro(userId: string) {
  if (!RC_KEY) return false;
  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${RC_KEY}` } });
    if (!res.ok) return false;
    const pro = (await res.json())?.subscriber?.entitlements?.pro;
    return !!pro && (!pro.expires_date || new Date(pro.expires_date).getTime() > Date.now());
  } catch {
    return false;
  }
}

/** Counts one use and returns null, or returns the reason it's over the limit. */
async function useOne(userId: string, kind: Kind) {
  const pro = kind === 'bitey' ? false : await isPro(userId);
  const limit = (pro ? PRO_LIMITS : FREE_LIMITS)[kind];
  const { data, error } = await admin.rpc('use_ai', { uid: userId, kind, lim: limit });
  if (error) throw new Error('Could not check your weekly AI uses. Try again.');
  if (data) return null;
  if (kind === 'bitey') return 'Bitey needs a rest. You can ask again next week.';
  if (kind === 'live') return 'Live guesses are used up for this week. You can still snap a photo for an estimate.';
  if (kind === 'fixes') return 'You made a lot of corrections this week. Change the grams by hand instead.';
  if (pro) return 'You reached this week\'s fair-use limit. It resets on Monday.';
  return kind === 'scans'
    ? `You used your ${FREE_LIMITS.scans} free photo scans this week. Get Snapspoon Pro for unlimited scans.`
    : `You used your ${FREE_LIMITS.recipes} free AI recipes this week. Get Snapspoon Pro for unlimited recipes.`;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const num = { type: 'number' };
const MEAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['meal_name', 'items', 'confidence', 'notes'],
  properties: {
    meal_name: { type: 'string' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    notes: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'grams', 'kcal', 'protein', 'carbs', 'fat'],
        properties: { name: { type: 'string' }, grams: num, kcal: num, protein: num, carbs: num, fat: num },
      },
    },
  },
};

const RECIPE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'cat', 'min', 'serv', 'kcal', 'p', 'c', 'f', 'tags', 'ing', 'steps'],
  properties: {
    title: { type: 'string' },
    cat: { type: 'string', enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'] },
    min: num, serv: num, kcal: num, p: num, c: num, f: num,
    tags: { type: 'array', items: { type: 'string', enum: ['High protein', 'Under 400', 'Low carb', 'Vegetarian', 'Vegan', 'Meal prep', 'No cook'] } },
    ing: { type: 'array', items: { type: 'string' } },
    steps: { type: 'array', items: { type: 'string' } },
  },
};

const MEAL_PROMPT = `The image is a photo of a meal for a weight-loss tracking app. Identify each distinct food or drink you can see, estimate its portion in grams, and estimate calories (kcal), protein, carbs and fat in grams for that portion using standard nutrition values. Be realistic about oils, sauces and dressings. In notes, give one short sentence on anything uncertain, such as hidden oil or portion size. If there is no food in the image, return an empty items list and say so in notes.`;

const fixPrompt = (estimate: unknown, correction: string) =>
  `Earlier you estimated this meal for a weight-loss tracking app:\n${JSON.stringify(estimate).slice(0, 4000)}\n\nThe user corrected it: "${correction}". Return the full corrected estimate. Keep foods the user didn't mention, change or add the ones they did, and recalculate grams, calories, protein, carbs and fat with standard nutrition values. In notes, say in one short sentence what you changed.`;

const recipePrompt = (request: string) =>
  `Write one healthy, realistic recipe for a weight-loss app. The user asked for: "${request}". Use metric amounts in the ingredients. Give calories and macros per serving, and keep them consistent: kcal should be close to 4*protein + 4*carbs + 9*fat. Keep each step to one short sentence.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function ask(content: Anthropic.Beta.BetaContentBlockParam[], schema: object) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content }],
  });
  if (response.stop_reason === 'refusal') throw new Error('The AI could not help with that request.');
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('The AI returned no answer. Try again.');
  return JSON.parse(text.text);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } };
    if (!auth.user) return json({ error: 'Please open Snapspoon again so it can sign you in, then try again.' }, 401);
    const userId = auth.user.id;

    const body = await req.json();
    const kind: Kind | null = body.mode === 'meal' ? 'scans' : body.mode === 'fix' ? 'fixes' : body.mode === 'recipe' ? 'recipes' : body.mode === 'bitey' ? 'bitey' : (EXTRA_KINDS[body.mode] ?? null);
    if (!kind) return json({ error: 'Unknown mode.' }, 400);
    const over = await useOne(userId, kind);
    if (over) return json({ error: over, limit: true }, 402);

    if (body.mode === 'fix') {
      const correction = String(body.correction ?? '').slice(0, 300).trim();
      if (!correction || typeof body.estimate !== 'object' || !body.estimate) return json({ error: 'Say what to change, like "it was 2 eggs".' }, 400);
      return json(await ask([{ type: 'text', text: fixPrompt(body.estimate, correction) }], MEAL_SCHEMA));
    }
    if (body.mode === 'meal') {
      if (typeof body.imageBase64 !== 'string' || !body.imageBase64) return json({ error: 'Send a photo.' }, 400);
      if (body.imageBase64.length > 7_000_000) return json({ error: 'That photo is too big. Try a smaller one.' }, 413);
      const mediaType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(body.mediaType) ? body.mediaType : 'image/jpeg';
      return json(
        await ask(
          [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: body.imageBase64 } },
            { type: 'text', text: MEAL_PROMPT },
          ],
          MEAL_SCHEMA,
        ),
      );
    }
    if (body.mode === 'recipe') {
      const prompt = String(body.prompt ?? '').slice(0, 500).trim();
      if (!prompt) return json({ error: 'Describe the recipe you want.' }, 400);
      return json(await ask([{ type: 'text', text: recipePrompt(prompt) }], RECIPE_SCHEMA));
    }
    if (body.mode === 'bitey') {
      // Keep the last 12 turns, each clipped, and make sure the conversation ends with the user.
      const messages = (Array.isArray(body.messages) ? body.messages : [])
        .filter((m: { role?: string; content?: unknown }) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
        .slice(-12)
        .map((m: { role: 'user' | 'assistant'; content: string }) => ({ role: m.role, content: m.content.slice(0, 1000) }));
      while (messages.length && messages[0].role !== 'user') messages.shift();
      if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'Ask Bitey something.' }, 400);
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 2000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: BITEY_GUIDE,
        messages,
      });
      const text = response.content.find((b) => b.type === 'text');
      return json({ text: text && text.type === 'text' ? text.text.trim() : "Sorry, I didn't catch that. Try asking another way." });
    }
    const extra = await handleExtra(body, (content, schema) => ask(content as Anthropic.Beta.BetaContentBlockParam[], schema));
    if (extra) return json(extra);
    return json({ error: 'Unknown mode.' }, 400);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'Too many requests right now. Try again in a minute.' }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `The AI service returned an error (${e.status}).` }, 502);
    return json({ error: e instanceof Error ? e.message : 'Something went wrong.' }, 500);
  }
});
