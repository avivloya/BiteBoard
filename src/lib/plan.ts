import type { Profile, Targets } from './types';

export const ACTIVITY = [
  { value: 1.2, title: 'Mostly sitting', sub: 'Desk job, little exercise' },
  { value: 1.375, title: 'Lightly active', sub: 'Walks or workouts 1 to 3 days a week' },
  { value: 1.55, title: 'Active', sub: 'Exercise 3 to 5 days a week' },
  { value: 1.725, title: 'Very active', sub: 'Hard training 6 to 7 days a week' },
];

export const PACE = [
  { value: 0.25, title: 'Gentle', sub: '0.25 kg a week' },
  { value: 0.5, title: 'Steady', sub: '0.5 kg a week, recommended' },
  { value: 0.75, title: 'Fast', sub: '0.75 kg a week' },
];

export type Plan = Targets & { tdee: number; weeks: number; bmi: number; losing: boolean };

/** Mifflin-St Jeor BMR x activity, minus a deficit sized to the chosen pace (7700 kcal per kg). */
export function calcPlan(d: Profile): Plan {
  const sexAdj = d.sex === 'male' ? 5 : d.sex === 'female' ? -161 : -78;
  const bmr = 10 * d.weightKg + 6.25 * d.heightCm - 5 * d.age + sexAdj;
  const tdee = bmr * d.activity;
  const losing = d.goalKg < d.weightKg;
  const floor = d.sex === 'male' ? 1500 : d.sex === 'female' ? 1200 : 1350;
  const raw = losing ? Math.max(floor, tdee - (d.pace * 7700) / 7) : tdee;
  const kcal = Math.round(raw / 10) * 10;
  const p = Math.round(1.6 * Math.min(d.weightKg, d.goalKg + 10));
  const f = Math.round((kcal * 0.28) / 9);
  const c = Math.max(50, Math.round((kcal - p * 4 - f * 9) / 4));
  const weeks = losing ? Math.ceil((d.weightKg - d.goalKg) / d.pace) : 0;
  const bmi = d.weightKg / (d.heightCm / 100) ** 2;
  return { kcal, p, c, f, tdee: Math.round(tdee), weeks, bmi, losing };
}

export const kgToLb = (kg: number) => kg * 2.20462;
export const lbToKg = (lb: number) => lb / 2.20462;
