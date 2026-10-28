import { create } from 'zustand';

import type { PublicProfile } from './social';
import type { Recipe } from './types';

/** People data fetched from Supabase. Kept in memory only; refetched when Account or Explore opens. */
type SocialState = {
  userId: string | null;
  me: PublicProfile | null;
  friendIds: string[];
  people: Record<string, PublicProfile>;
  feed: Recipe[];
  /** newest posts from everyone, for Explore */
  forYou: Recipe[];
  set: (patch: Partial<Omit<SocialState, 'set'>>) => void;
};

export const useSocial = create<SocialState>()((set) => ({
  userId: null,
  me: null,
  friendIds: [],
  people: {},
  feed: [],
  forYou: [],
  set: (patch) => set(patch),
}));
