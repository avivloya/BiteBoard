import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** A dated progress photo kept on this phone. */
export type ProgressPhoto = { id: string; uri: string; day: string; kg?: number };

type Extras = {
  /** ask for Face ID, Touch ID or the phone's passcode when the app opens */
  faceLock: boolean;
  /** show calories left on the Lock Screen and Dynamic Island (iPhone) */
  liveActivity: boolean;
  progress: ProgressPhoto[];
  set: (patch: Partial<Omit<Extras, 'set'>>) => void;
};

// Newer features keep their settings here, apart from the main store, so the two can change independently.
export const useExtras = create<Extras>()(
  persist(
    (set) => ({
      faceLock: false,
      liveActivity: false,
      progress: [],
      set: (patch) => set(patch),
    }),
    { name: 'snapspoon:extras', storage: createJSONStorage(() => AsyncStorage), partialize: ({ set: _s, ...rest }) => rest },
  ),
);
