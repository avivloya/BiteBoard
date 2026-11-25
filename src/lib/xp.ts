import { useExtras } from './extras';
import { useStore } from './store';
import { streakInfo } from './streak';

// XP comes from what you have already done, so it can't get out of sync:
// 10 per meal logged, 25 per day logged, 15 per weigh-in, 40 per recipe you made, 20 per progress photo, 5 per mood check-in.
export type Badge = { id: string; emoji: string; title: string; how: string; done: boolean };

export function myXp() {
  const s = useStore.getState(), ex = useExtras.getState();
  const dayKeys = Object.keys(s.days).filter((k) => s.days[k]?.length);
  const meals = dayKeys.reduce((a, k) => a + s.days[k].length, 0);
  const photos = dayKeys.reduce((a, k) => a + s.days[k].filter((e) => e.src === 'photo').length, 0);
  const barcodes = dayKeys.reduce((a, k) => a + s.days[k].filter((e) => e.src === 'barcode').length, 0);
  const weighIns = Object.keys(s.weights).length;
  const recipes = s.mine.length;
  const moods = Object.keys(ex.moods).length;
  const streak = streakInfo(s.days);
  const onTarget = dayKeys.filter((k) => s.days[k].reduce((a, e) => a + e.kcal, 0) <= s.targets.kcal * 1.05).length;
  const proteinDays = dayKeys.filter((k) => s.days[k].reduce((a, e) => a + e.p, 0) >= s.targets.p).length;
  const w = Object.keys(s.weights).sort();
  const lost = w.length > 1 ? s.weights[w[0]] - s.weights[w[w.length - 1]] : 0;

  const xp = meals * 10 + dayKeys.length * 25 + weighIns * 15 + recipes * 40 + ex.progress.length * 20 + moods * 5;
  // Each level needs a little more than the last: 100, 250, 450, 700...
  let level = 1, need = 100, floor = 0;
  while (xp >= floor + need) { floor += need; level++; need = 100 + (level - 1) * 50; }

  const badges: Badge[] = [
    { id: 'first', emoji: '🥄', title: 'First bite', how: 'Log your first meal', done: meals >= 1 },
    { id: 'snap10', emoji: '📸', title: 'Snap happy', how: 'Snap 10 meals with the camera', done: photos >= 10 },
    { id: 'barcode', emoji: '🏷️', title: 'Label reader', how: 'Scan 5 barcodes', done: barcodes >= 5 },
    { id: 'streak3', emoji: '🔥', title: 'Warming up', how: 'Reach a 3 day streak', done: streak.best >= 3 },
    { id: 'streak7', emoji: '⚡', title: 'One week strong', how: 'Reach a 7 day streak', done: streak.best >= 7 },
    { id: 'streak30', emoji: '🏆', title: 'Habit made', how: 'Reach a 30 day streak', done: streak.best >= 30 },
    { id: 'streak100', emoji: '💯', title: 'Centurion', how: 'Reach a 100 day streak', done: streak.best >= 100 },
    { id: 'target10', emoji: '🎯', title: 'On target', how: 'Stay within your calories on 10 days', done: onTarget >= 10 },
    { id: 'protein7', emoji: '💪', title: 'Protein pro', how: 'Hit your protein goal on 7 days', done: proteinDays >= 7 },
    { id: 'weigh4', emoji: '⚖️', title: 'Check-in champ', how: 'Log your weight 4 times', done: weighIns >= 4 },
    { id: 'lost2', emoji: '📉', title: 'First 2 kg', how: 'Lose 2 kg (4.4 lb)', done: lost >= 2 },
    { id: 'lost5', emoji: '🌟', title: 'Five down', how: 'Lose 5 kg (11 lb)', done: lost >= 5 },
    { id: 'chef', emoji: '👩‍🍳', title: 'Home chef', how: 'Make 3 recipes of your own', done: recipes >= 3 },
    { id: 'photo', emoji: '🪞', title: 'Then and now', how: 'Take 2 progress photos', done: ex.progress.length >= 2 },
    { id: 'mood', emoji: '😊', title: 'In tune', how: 'Check in your mood on 7 days', done: moods >= 7 },
  ];
  return { xp, level, intoLevel: xp - floor, levelSize: need, badges, freezes: ex.freezes };
}
