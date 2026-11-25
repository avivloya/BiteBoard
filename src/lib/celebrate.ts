import { create } from 'zustand';

/** A confetti burst with a short message, shown over every screen (see components/confetti). */
type Party = { id: number; title: string; sub?: string } | null;
export const useParty = create<{ party: Party; set: (p: Party) => void }>((set) => ({ party: null, set: (party) => set({ party }) }));

export const celebrate = (title: string, sub?: string) => useParty.getState().set({ id: Date.now(), title, sub });
