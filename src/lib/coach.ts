import { LIBRARY } from '@/data/recipes';
import { dayKey, guessMeal } from './dates';
import { totals, useStore } from './store';
import type { Recipe } from './types';

/** Calories and macros left today, and what has been eaten. */
export function leftToday() {
  const s = useStore.getState();
  const entries = s.days[dayKey()] ?? [];
  const t = totals(entries);
  const g = s.targets;
  return {
    left: { kcal: Math.max(0, g.kcal - t.kcal), p: Math.max(0, g.p - t.p), c: Math.max(0, g.c - t.c), f: Math.max(0, g.f - t.f) },
    eaten: entries.map((e) => e.name),
    meal: guessMeal(),
  };
}

/** Recipes from the library and your own that fit the calories left, best protein first. Works without AI. */
export function recipesThatFit(kcalLeft: number, meal = guessMeal(), n = 4): Recipe[] {
  const all = [...useStore.getState().mine, ...LIBRARY].filter((r) => r.kcal > 0 && r.kcal <= kcalLeft);
  const score = (r: Recipe) => (r.cat === meal ? 1000 : 0) + r.p * 10 - Math.abs(kcalLeft * 0.6 - r.kcal) / 10;
  return all.sort((a, b) => score(b) - score(a)).slice(0, n);
}
