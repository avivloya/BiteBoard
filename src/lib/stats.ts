import { dayKey, shiftDay } from './dates';
import { totals, useStore } from './store';
import { streakInfo } from './streak';

/** Numbers for share cards and recaps. */
export function myStats(daysBack = 7) {
  const s = useStore.getState();
  const keys = Array.from({ length: daysBack }, (_, i) => shiftDay(dayKey(), -i));
  const logged = keys.filter((k) => (s.days[k]?.length ?? 0) > 0);
  const avg = logged.length ? logged.reduce((a, k) => a + totals(s.days[k]).kcal, 0) / logged.length : 0;
  const onTarget = logged.filter((k) => totals(s.days[k]).kcal <= s.targets.kcal * 1.05).length;
  const w = Object.keys(s.weights).sort();
  const lost = w.length > 1 ? s.weights[w[0]] - s.weights[w[w.length - 1]] : 0;
  const allDays = Object.keys(s.days).filter((k) => s.days[k]?.length).length;
  return { streak: streakInfo(s.days), avgKcal: Math.round(avg), onTarget, loggedDays: logged.length, lostKg: Math.round(lost * 10) / 10, allDays, goal: s.targets.kcal, name: s.profile?.name ?? '' };
}
