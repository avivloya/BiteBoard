import { dayKey, shiftDay } from './dates';

/**
 * "At this pace you'll reach your goal by March 3." A straight line through the last 4 weeks of weigh-ins.
 * Returns null when there's not enough data or you're not moving toward the goal.
 */
export function goalDate(weights: Record<string, number>, goalKg: number) {
  const since = shiftDay(dayKey(), -28);
  const pts = Object.keys(weights).filter((d) => d >= since).sort().map((d) => ({ t: Date.parse(d) / 86_400_000, kg: weights[d] }));
  if (pts.length < 3 || !goalKg) return null;
  const n = pts.length, mt = pts.reduce((a, p) => a + p.t, 0) / n, mk = pts.reduce((a, p) => a + p.kg, 0) / n;
  const slope = pts.reduce((a, p) => a + (p.t - mt) * (p.kg - mk), 0) / pts.reduce((a, p) => a + (p.t - mt) ** 2, 0); // kg per day
  const now = pts[n - 1];
  const toGo = goalKg - now.kg;
  if (Math.abs(toGo) < 0.1) return { date: new Date(), perWeek: slope * 7, reached: true };
  if (!Number.isFinite(slope) || slope === 0 || Math.sign(slope) !== Math.sign(toGo)) return null;
  const daysLeft = toGo / slope;
  if (daysLeft > 730) return null;
  return { date: new Date((now.t + daysLeft) * 86_400_000), perWeek: slope * 7, reached: false };
}

export const niceDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
