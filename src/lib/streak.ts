import { dayKey, shiftDay } from './dates';
import { useExtras } from './extras';
import type { Entry } from './types';

/** Consecutive days with at least one logged meal (or a streak freeze), ending today (or yesterday if today is still empty). */
export function streakInfo(days: Record<string, Entry[]>) {
  const frozen = new Set(useExtras.getState().frozenDays);
  const has = (k: string) => (days[k]?.length ?? 0) > 0 || frozen.has(k);
  let k = dayKey();
  const today = (days[k]?.length ?? 0) > 0;
  if (!today) k = shiftDay(k, -1);
  let current = 0;
  while (has(k)) {
    current++;
    k = shiftDay(k, -1);
  }
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  const all = new Set([...Object.keys(days).filter(has), ...frozen]);
  for (const d of [...all].sort()) {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, today, best: Math.max(best, current) };
}

/**
 * Streak freezes. Call when the app opens: if yesterday was missed but the day before was logged,
 * a freeze (if you have one) covers yesterday. Every 7 days in a row earns a freeze, up to 2.
 * Returns what happened so the app can say so.
 */
export function applyFreezes(days: Record<string, Entry[]>): 'used' | 'earned' | null {
  const ex = useExtras.getState();
  const y = shiftDay(dayKey(), -1), before = shiftDay(dayKey(), -2);
  const logged = (k: string) => (days[k]?.length ?? 0) > 0 || ex.frozenDays.includes(k);
  if (!logged(y) && logged(before) && ex.freezes > 0) {
    ex.set({ freezes: ex.freezes - 1, frozenDays: [...ex.frozenDays, y].slice(-60) });
    return 'used';
  }
  const { current } = streakInfo(days);
  const mark = `${current}@${shiftDay(dayKey(), -current)}`; // this streak, counted from its first day
  if (current > 0 && current % 7 === 0 && ex.freezes < 2 && !ex.freezeEarned.includes(mark)) {
    ex.set({ freezes: ex.freezes + 1, freezeEarned: [...ex.freezeEarned, mark].slice(-30) });
    return 'earned';
  }
  return null;
}
