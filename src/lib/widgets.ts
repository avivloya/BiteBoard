import { Platform } from 'react-native';

import { dayKey } from './dates';
import { useExtras } from './extras';
import { totals, useStore } from './store';
import { streakInfo } from './streak';
import type { CaloriesProps } from '@/widgets/calories';

// Keeps the iPhone widgets and the Live Activity (Lock Screen + Dynamic Island) in step with today's log.
// Widgets need a development or store build; in Expo Go and on Android/web this quietly does nothing.
type Mod = typeof import('@/widgets/calories');
let mod: Mod | null | undefined;
const widgets = (): Mod | null => {
  if (mod !== undefined) return mod;
  try { mod = Platform.OS === 'ios' ? (require('@/widgets/calories') as Mod) : null; } catch { mod = null; }
  return mod;
};

const props = (): CaloriesProps => {
  const s = useStore.getState();
  const t = totals(s.days[dayKey()] ?? []);
  return { left: s.targets.kcal - t.kcal, eaten: t.kcal, goal: s.targets.kcal, protein: t.p, streak: streakInfo(s.days).current };
};

function push() {
  const w = widgets();
  if (!w) return;
  const p = props();
  try { w.CaloriesWidget.updateSnapshot(p); } catch {}
  try {
    const live = w.CaloriesActivity.getInstances();
    if (useExtras.getState().liveActivity) {
      if (live.length) live.forEach((a) => a.update(p).catch(() => {}));
      else w.CaloriesActivity.start(p, 'snapspoon://today');
    } else live.forEach((a) => a.end('immediate').catch(() => {}));
  } catch {}
}

export const widgetsSupported = () => !!widgets();

/** Starts syncing. Returns a function that stops it. */
export function syncWidgets() {
  if (!widgets()) return () => {};
  push();
  let timer: ReturnType<typeof setTimeout>;
  const later = () => { clearTimeout(timer); timer = setTimeout(push, 400); };
  const a = useStore.subscribe((s, prev) => { if (s.days !== prev.days || s.targets !== prev.targets) later(); });
  const b = useExtras.subscribe((s, prev) => { if (s.liveActivity !== prev.liveActivity) later(); });
  return () => { a(); b(); clearTimeout(timer); };
}
