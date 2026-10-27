// Biteboard AI endpoint (Supabase Edge Function, Deno).
// POST { mode: "meal", imageBase64, mediaType }  -> MealEstimate JSON
// POST { mode: "recipe", prompt }                -> RecipeDraft JSON
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
import Anthropic from 'npm:@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
const MODEL = 'claude-opus-5-5';

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
    const body = await req.json();
    if (body.mode === 'meal') {
      if (typeof body.imageBase64 !== 'string' || !body.imageBase64) return json({ error: 'Send a photo.' }, 400);
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
    return json({ error: 'Unknown mode.' }, 400);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'Too many requests right now. Try again in a minute.' }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `The AI service returned an error (${e.status}).` }, 502);
    return json({ error: e instanceof Error ? e.message : 'Something went wrong.' }, 500);
  }
});
