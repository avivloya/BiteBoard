import { celebrate } from './celebrate';
import { dayKey } from './dates';
import { haptic } from './haptics';
import { totals, useStore } from './store';
import { streakInfo } from './streak';

const MILESTONES = [3, 7, 14, 30, 50, 100, 180, 365];

/**
 * Small moments of feedback while you log: a vibration for every meal, a warning buzz when you
 * go over your goal, and confetti when you start a day's streak or hit a milestone.
 * Returns a function that stops watching.
 */
export function watchMoments() {
  return useStore.subscribe((s, prev) => {
    if (s.days === prev.days) return;
    const k = dayKey();
    const now = s.days[k] ?? [], before = prev.days[k] ?? [];
    if (now.length <= before.length) return;
    const kcal = totals(now).kcal, was = totals(before).kcal, goal = s.targets.kcal;
    if (before.length === 0) {
      const { current } = streakInfo(s.days);
      haptic.success();
      if (MILESTONES.includes(current)) celebrate(`${current} day streak!`, 'You are on fire. Keep it going.');
      else if (current > 1) celebrate(`Day ${current}`, 'Streak kept. Nice work.');
      return;
    }
    if (was <= goal && kcal > goal) return haptic.warn();
    if (was < goal * 0.95 && kcal >= goal * 0.95 && kcal <= goal) { haptic.success(); return celebrate('Goal reached', 'Right on your calories for today.'); }
    haptic.success();
  });
}
