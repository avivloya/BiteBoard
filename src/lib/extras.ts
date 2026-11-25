import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { MealPlan } from './ai';
import type { Recipe } from './types';

/** A dated progress photo kept on this phone. */
export type ProgressPhoto = { id: string; uri: string; day: string; kg?: number };

type Extras = {
  /** ask for Face ID, Touch ID or the phone's passcode when the app opens */
  faceLock: boolean;
  /** show calories left on the Lock Screen and Dynamic Island (iPhone) */
  liveActivity: boolean;
  progress: ProgressPhoto[];
  /** streak freezes you can still use (earned: one per 7 days in a row, up to 2) */
  freezes: number;
  /** days a freeze covered, so the streak doesn't break */
  frozenDays: string[];
  /** 7-day streaks that already earned a freeze, by the day they were earned */
  freezeEarned: string[];
  /** how you felt each day, 1 (low) to 5 (great) */
  moods: Record<string, { mood: number; energy: number }>;
  /** the AI weekly meal plan and which grocery items are ticked */
  plan: MealPlan | null;
  groceryDone: string[];
  /** badges you've already been congratulated for */
  badgesSeen: string[];
  /** cooking videos you saved from the feed, newest first (a copy, so they stay even if the feed changes) */
  savedVideos: Recipe[];
  set: (patch: Partial<Omit<Extras, 'set'>>) => void;
};

/** Save or unsave a cooking video. Returns true when it is now saved. */
export function toggleSavedVideo(r: Recipe) {
  const list = useExtras.getState().savedVideos;
  const on = !list.some((x) => x.id === r.id);
  useExtras.getState().set({ savedVideos: on ? [r, ...list].slice(0, 200) : list.filter((x) => x.id !== r.id) });
  return on;
}

// Newer features keep their settings here, apart from the main store, so the two can change independently.
export const useExtras = create<Extras>()(
  persist(
    (set) => ({
      faceLock: false,
      liveActivity: false,
      progress: [],
      freezes: 1,
      frozenDays: [],
      freezeEarned: [],
      moods: {},
      plan: null,
      groceryDone: [],
      badgesSeen: [],
      savedVideos: [],
      set: (patch) => set(patch),
    }),
    { name: 'snapspoon:extras', storage: createJSONStorage(() => AsyncStorage), partialize: ({ set: _s, ...rest }) => rest },
  ),
);
