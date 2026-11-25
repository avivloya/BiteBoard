import { celebrate } from './celebrate';
import { dayKey } from './dates';
import { haptic } from './haptics';
import { totals, useStore } from './store';
import { useExtras } from './extras';
import { applyFreezes, streakInfo } from './streak';
import { myXp } from './xp';

const MILESTONES = [3, 7, 14, 30, 50, 100, 180, 365];

/**
 * Small moments of feedback while you log: a vibration for every meal, a warning buzz when you
 * go over your goal, and confetti when you start a day's streak or hit a milestone.
 * Returns a function that stops watching.
 */
export function watchMoments() {
  const startup = () => {
    const froze = applyFreezes(useStore.getState().days);
    if (froze === 'used') celebrate('Streak saved 🧊', 'You missed yesterday, so a streak freeze kept your streak alive.');
    if (froze === 'earned') celebrate('Streak freeze earned 🧊', 'Seven days in a row! If you miss a day, it keeps your streak.');
    checkBadges(true);
  };
  // Wait for the saved freezes and badges to load first.
  if (useExtras.persist.hasHydrated()) startup();
  else useExtras.persist.onFinishHydration(startup);
  let badgeTimer: ReturnType<typeof setTimeout>;
  const unsub = useStore.subscribe((s, prev) => {
    if (s.days !== prev.days || s.weights !== prev.weights || s.mine !== prev.mine) { clearTimeout(badgeTimer); badgeTimer = setTimeout(() => checkBadges(), 3200); }
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
  return () => { unsub(); clearTimeout(badgeTimer); };
}

/** Confetti for each new badge. On first run it only remembers the ones you already have. */
export function checkBadges(quiet = false) {
  const ex = useExtras.getState();
  const fresh = myXp().badges.filter((b) => b.done && !ex.badgesSeen.includes(b.id));
  if (!fresh.length) return;
  ex.set({ badgesSeen: [...ex.badgesSeen, ...fresh.map((b) => b.id)] });
  if (!quiet || ex.badgesSeen.length) celebrate(`${fresh[0].emoji} ${fresh[0].title}`, `New badge: ${fresh[0].how.toLowerCase()}.`);
}
