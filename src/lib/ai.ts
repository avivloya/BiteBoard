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
