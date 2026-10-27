import { create } from 'zustand';

import type { PublicProfile } from './social';
import type { Recipe } from './types';

/** Friends data fetched from Supabase. Kept in memory only; refetched when the Friends tab opens. */
type SocialState = {
  userId: string | null;
  me: PublicProfile | null;
  friendIds: string[];
  people: Record<string, PublicProfile>;
  feed: Recipe[];
  set: (patch: Partial<Omit<SocialState, 'set'>>) => void;
};

export const useSocial = create<SocialState>()((set) => ({
  userId: null,
  me: null,
  friendIds: [],
  people: {},
  feed: [],
  set: (patch) => set(patch),
}));
