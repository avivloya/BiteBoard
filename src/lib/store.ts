import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { LIBRARY } from '@/data/recipes';
import { dayKey } from './dates';
import { calcPlan } from './plan';
import { deleteRecipePhoto } from './photos';
import type { Board, Entry, Profile, Recipe, Reminders, Targets } from './types';

const uid = () => Math.random().toString(36).slice(2, 10);
const latestDay = (w: Record<string, number>) => Object.keys(w).sort().pop() ?? '';

/** Monday of the current week, as a day key. */
export function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return dayKey(x);
}

type State = {
  hydrated: boolean;
  profile: Profile | null;
  targets: Targets;
  boards: Board[];
  mine: Recipe[];
  days: Record<string, Entry[]>;
  /** weigh-ins by day, in kg */
  weights: Record<string, number>;
  reminders: Reminders;
  /** free-tier AI usage, reset each week */
  aiUsage: { week: string; scans: number; recipes: number };
  /** photos the user added, by recipe id (works for library recipes too) */
  photos: Record<string, string>;

  logWeight: (kg: number, day?: string) => void;
  removeWeight: (day: string) => void;
  setReminders: (r: Reminders) => void;
  countAiUse: (kind: 'scans' | 'recipes') => void;
  finishOnboarding: (p: Profile) => void;
  setTargets: (t: Targets) => void;
  addEntry: (e: Omit<Entry, 'id' | 't'>, day?: string) => void;
  removeEntry: (day: string, id: string) => void;
  toggleSave: (boardId: string, recipeId: string) => void;
  createBoard: (name: string, firstRecipe?: string) => string;
  renameBoard: (id: string, name: string) => void;
  deleteBoard: (id: string) => void;
  addRecipe: (r: Omit<Recipe, 'id'>) => string;
  updateRecipe: (id: string, patch: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  setPhoto: (recipeId: string, uri: string | null) => void;
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      profile: null,
      targets: { kcal: 1800, p: 130, c: 180, f: 60 },
      boards: [
        { id: 'b1', name: 'High protein lunches', ids: ['r2', 'r6', 'r10'] },
        { id: 'b2', name: 'Quick breakfasts', ids: ['r1', 'r4', 'r8'] },
      ],
      mine: [],
      photos: {},
      days: {},
      weights: {},
      reminders: { meals: false, streak: false, weighIn: false },
      aiUsage: { week: weekStart(), scans: 0, recipes: 0 },

      logWeight: (kg, day = dayKey()) =>
        set((s) => ({ weights: { ...s.weights, [day]: kg }, profile: s.profile && day >= latestDay(s.weights) ? { ...s.profile, weightKg: kg } : s.profile })),
      removeWeight: (day) => set((s) => { const { [day]: _, ...rest } = s.weights; return { weights: rest }; }),
      setReminders: (reminders) => set({ reminders }),
      countAiUse: (kind) => set((s) => {
        const u = s.aiUsage.week === weekStart() ? s.aiUsage : { week: weekStart(), scans: 0, recipes: 0 };
        return { aiUsage: { ...u, [kind]: u[kind] + 1 } };
      }),
      finishOnboarding: (p) => {
        const plan = calcPlan(p);
        set((s) => ({
          profile: p,
          targets: { kcal: plan.kcal, p: plan.p, c: plan.c, f: plan.f },
          weights: Object.keys(s.weights).length ? s.weights : { [dayKey()]: p.weightKg },
        }));
      },
      setTargets: (targets) => set({ targets }),
      addEntry: (e, day = dayKey()) =>
        set((s) => ({ days: { ...s.days, [day]: [...(s.days[day] ?? []), { ...e, id: uid(), t: Date.now() }] } })),
      removeEntry: (day, id) =>
        set((s) => ({ days: { ...s.days, [day]: (s.days[day] ?? []).filter((x) => x.id !== id) } })),
      toggleSave: (boardId, recipeId) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id !== boardId ? b : { ...b, ids: b.ids.includes(recipeId) ? b.ids.filter((x) => x !== recipeId) : [recipeId, ...b.ids] },
          ),
        })),
      createBoard: (name, firstRecipe) => {
        const id = 'b' + uid();
        set((s) => ({ boards: [...s.boards, { id, name, ids: firstRecipe ? [firstRecipe] : [] }] }));
        return id;
      },
      renameBoard: (id, name) => set((s) => ({ boards: s.boards.map((b) => (b.id === id ? { ...b, name } : b)) })),
      deleteBoard: (id) => set((s) => ({ boards: s.boards.filter((b) => b.id !== id) })),
      addRecipe: (r) => {
        const id = (r.ai ? 'ai-' : 'own-') + uid();
        set((s) => ({ mine: [{ ...r, id }, ...s.mine] }));
        return id;
      },
      updateRecipe: (id, patch) => set((s) => ({ mine: s.mine.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRecipe: (id) => {
        deleteRecipePhoto(get().photos[id]);
        set((s) => {
          const { [id]: _gone, ...photos } = s.photos;
          return { photos, mine: s.mine.filter((r) => r.id !== id), boards: s.boards.map((b) => ({ ...b, ids: b.ids.filter((x) => x !== id) })) };
        });
      },
      setPhoto: (recipeId, uri) => {
        const old = get().photos[recipeId];
        if (old && old !== uri) deleteRecipePhoto(old);
        set((s) => {
          const { [recipeId]: _old, ...rest } = s.photos;
          return { photos: uri ? { ...rest, [recipeId]: uri } : rest };
        });
      },
    }),
    {
      name: 'biteboard',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated, ...rest }) => rest,
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);

export const findRecipe = (id: string, extra: Recipe[] = []) =>
  useStore.getState().mine.find((r) => r.id === id) ?? LIBRARY.find((r) => r.id === id) ?? extra.find((r) => r.id === id);

export const totals = (entries: Entry[] = []) =>
  entries.reduce((a, e) => ({ kcal: a.kcal + e.kcal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }), { kcal: 0, p: 0, c: 0, f: 0 });

export const FREE_LIMITS = { scans: 3, recipes: 3 } as const;

/** AI uses left this week on the free plan. */
export const aiLeft = (kind: 'scans' | 'recipes') => {
  const u = useStore.getState().aiUsage;
  return Math.max(0, FREE_LIMITS[kind] - (u.week === weekStart() ? u[kind] : 0));
};
