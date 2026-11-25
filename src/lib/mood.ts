import { totals } from './store';

/** Simple comparisons between days, in plain sentences. Needs at least 3 days on each side. */
export function moodInsights(moods: Record<string, { mood: number; energy: number }>, days: Record<string, { kcal: number; p: number; c: number; f: number }[]>, proteinGoal: number, kcalGoal: number) {
  const rows = Object.entries(moods).map(([k, m]) => ({ ...m, ...totals((days[k] ?? []) as never), logged: (days[k]?.length ?? 0) > 0 }));
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const out: string[] = [];
  const compare = (yes: typeof rows, no: typeof rows, key: 'mood' | 'energy', what: string) => {
    if (yes.length < 3 || no.length < 3) return;
    const a = avg(yes.map((r) => r[key])), b = avg(no.map((r) => r[key]));
    if (Math.abs(a - b) >= 0.4) out.push(`On days ${what}, your ${key} was ${a > b ? 'higher' : 'lower'}: ${a.toFixed(1)} vs ${b.toFixed(1)} out of 5.`);
  };
  const logged = rows.filter((r) => r.logged);
  compare(logged.filter((r) => r.p >= proteinGoal * 0.9), logged.filter((r) => r.p < proteinGoal * 0.9), 'energy', 'you hit your protein');
  compare(logged.filter((r) => r.kcal <= kcalGoal * 1.05), logged.filter((r) => r.kcal > kcalGoal * 1.05), 'mood', 'you stayed on target');
  compare(logged.filter((r) => r.c < 100), logged.filter((r) => r.c >= 100), 'energy', 'with fewer carbs');
  compare(rows.filter((r) => r.logged), rows.filter((r) => !r.logged), 'mood', 'you logged your food');
  return out;
}
