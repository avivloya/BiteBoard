import type { Meal } from './types';

// Calls the Snapspoon backend (supabase/functions/ai). The Anthropic API key lives only on the server.
const API_URL = process.env.EXPO_PUBLIC_AI_URL;

export type MealItem = { name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number };
export type MealEstimate = { meal_name: string; items: MealItem[]; confidence: 'low' | 'medium' | 'high'; notes: string };
export type RecipeDraft = {
  title: string; cat: Meal; min: number; serv: number; kcal: number; p: number; c: number; f: number;
  tags: string[]; ing: string[]; steps: string[];
};

export const aiConfigured = !!API_URL;

async function call<T>(body: object): Promise<T> {
  if (!API_URL) throw new Error('The AI backend is not set up yet. Add EXPO_PUBLIC_AI_URL to your .env file.');
  const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(data?.error ?? `The AI request failed (${res.status}). Try again.`);
  return data as T;
}

export const estimateMeal = (imageBase64: string, mediaType: string) =>
  call<MealEstimate>({ mode: 'meal', imageBase64, mediaType });

export const draftRecipe = (prompt: string) => call<RecipeDraft>({ mode: 'recipe', prompt });

export const askBitey = (messages: { role: 'user' | 'assistant'; content: string }[]) => call<{ text: string }>({ mode: 'bitey', messages });

// Newer AI features (server side: supabase/functions/ai/extra.ts).
export type LiveGuess = { name: string; kcal: number };
export type CoachIdea = { title: string; kcal: number; protein: number; why: string };
export type CoachReply = { tip: string; ideas: CoachIdea[] };
export type FridgeReply = { ingredients: string[]; recipes: RecipeDraft[] };

export const liveGuess = (imageBase64: string) => call<LiveGuess>({ mode: 'live', imageBase64, mediaType: 'image/jpeg' });
export const estimateText = (text: string) => call<MealEstimate>({ mode: 'text', text });
export const askCoach = (b: { left: { kcal: number; p: number; c: number; f: number }; eaten: string[]; meal: string; prefs?: string }) =>
  call<CoachReply>({ mode: 'coach', ...b });
export const scanFridge = (imageBase64: string, mediaType: string) => call<FridgeReply>({ mode: 'fridge', imageBase64, mediaType });

// Second batch: menus, recipe links, weekly plans, lighter versions.
export type MenuDish = { name: string; kcal: number; protein: number; fit: 'great' | 'ok' | 'heavy'; tip: string };
export type MealPlanDay = { day: string; meals: { meal: Meal; title: string; kcal: number; protein: number }[] };
export type MealPlan = { days: MealPlanDay[]; grocery: { aisle: string; items: string[] }[]; made: string; kcal: number };
export type Lighter = RecipeDraft & { swaps: string[] };

export const scanMenu = (imageBase64: string, mediaType: string, kcalLeft: number) => call<{ dishes: MenuDish[] }>({ mode: 'menu', imageBase64, mediaType, kcalLeft });
export const importRecipe = (source: string) => call<RecipeDraft>({ mode: 'import', source });
export const planWeek = (b: { kcal: number; protein: number; prefs?: string }) => call<Omit<MealPlan, 'made' | 'kcal'>>({ mode: 'plan', ...b });
export const lightenRecipe = (recipe: object) => call<Lighter>({ mode: 'lighten', recipe });
