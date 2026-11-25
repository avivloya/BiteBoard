import { ensureSession, supabase } from './social';
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

/** The server said this week's free uses are gone. Screens send people to the Pro page when they see it. */
export class AiLimitError extends Error {}

/** The signed-in account's token. The AI only answers signed-in accounts (guests count), so nobody can use it for free from outside the app. */
async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};
  await ensureSession();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}`, apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '' } : {};
}

async function call<T>(body: object): Promise<T> {
  if (!API_URL) throw new Error('The AI backend is not set up yet. Add EXPO_PUBLIC_AI_URL to your .env file.');
  const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (res.status === 402 && data?.limit) throw new AiLimitError(data.error ?? 'You used your free AI this week.');
  if (!res.ok || !data) throw new Error(data?.error ?? `The AI request failed (${res.status}). Try again.`);
  return data as T;
}

export const estimateMeal = (imageBase64: string, mediaType: string) =>
  call<MealEstimate>({ mode: 'meal', imageBase64, mediaType });

/** Redoes an estimate from a correction like "it was 2 eggs, not 3". */
export const fixEstimate = (estimate: MealEstimate, correction: string) => call<MealEstimate>({ mode: 'fix', estimate, correction });

export const draftRecipe = (prompt: string) => call<RecipeDraft>({ mode: 'recipe', prompt });

export const askBitey = (messages: { role: 'user' | 'assistant'; content: string }[]) => call<{ text: string }>({ mode: 'bitey', messages });
