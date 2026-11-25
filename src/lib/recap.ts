import { dayKey, shiftDay } from './dates';
import { totals, useStore } from './store';
import { streakInfo } from './streak';
import type { Entry } from './types';

/** Everything you logged from `from` to today: totals, favorites and best days. Used by the weekly recap and Wrapped. */
export function recapSince(from: string) {
  const s = useStore.getState();
  const keys = Object.keys(s.days).filter((k) => k >= from && k <= dayKey() && s.days[k]?.length).sort();
  const entries: Entry[] = keys.flatMap((k) => s.days[k]);
  const count: Record<string, number> = {};
  entries.forEach((e) => { const n = e.name.trim(); if (n) count[n] = (count[n] ?? 0) + 1; });
  const top = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const byMeal: Record<string, number> = {};
  entries.forEach((e) => { byMeal[e.meal] = (byMeal[e.meal] ?? 0) + 1; });
  const favMeal = Object.entries(byMeal).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const dayTotals = keys.map((k) => ({ k, ...totals(s.days[k]) }));
  const onTarget = dayTotals.filter((d) => d.kcal <= s.targets.kcal * 1.05).length;
  const protein = Math.round(dayTotals.reduce((a, d) => a + d.p, 0));
  const best = [...dayTotals].sort((a, b) => b.p - a.p)[0];
  const w = Object.keys(s.weights).filter((k) => k >= shiftDay(from, -7)).sort();
  const lostKg = w.length > 1 ? Math.round((s.weights[w[0]] - s.weights[w[w.length - 1]]) * 10) / 10 : 0;
  const photos = entries.filter((e) => e.src === 'photo').length;
  return { days: keys.length, meals: entries.length, top, favMeal, onTarget, protein, bestProteinDay: best, lostKg, photos, streak: streakInfo(s.days), entries, name: s.profile?.name ?? '', units: s.profile?.units ?? 'metric' };
}
