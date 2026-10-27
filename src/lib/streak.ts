import { dayKey, shiftDay } from './dates';
import type { Entry } from './types';

/** Consecutive days with at least one logged meal, ending today (or yesterday if today is still empty). */
export function streakInfo(days: Record<string, Entry[]>) {
  const has = (k: string) => (days[k]?.length ?? 0) > 0;
  let k = dayKey();
  const today = has(k);
  if (!today) k = shiftDay(k, -1);
  let current = 0;
  while (has(k)) {
    current++;
    k = shiftDay(k, -1);
  }
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of Object.keys(days).filter(has).sort()) {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, today, best: Math.max(best, current) };
}
