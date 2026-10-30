import { View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { T } from './ui';

/** Line chart of weigh-ins with a dashed goal line. Values in the display unit. */
export function WeightChart({ points, goal, height = 140 }: { points: { day: string; v: number }[]; goal: number; height?: number }) {
  const W = 300, H = height, pad = 10;
  if (points.length < 2) return <T variant="muted">Log your weight on two or more days to see your trend.</T>;
  const vs = [...points.map((p) => p.v), goal];
  const min = Math.min(...vs) - 1, max = Math.max(...vs) + 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / (max - min)) * (H - pad * 2);
  const last = points[points.length - 1];
  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Line x1={pad} x2={W - pad} y1={y(goal)} y2={y(goal)} stroke={Colors.muted} strokeDasharray="4 4" strokeWidth={1} />
        <Polyline points={points.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')} fill="none" stroke={Colors.accent} strokeWidth={2.5} strokeLinejoin="round" />
        <Circle cx={x(points.length - 1)} cy={y(last.v)} r={4.5} fill={Colors.accent} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T variant="muted" style={{ fontSize: 11 }}>{points[0].day}</T>
        <T variant="muted" style={{ fontSize: 11 }}>Goal {Math.round(goal * 10) / 10}</T>
        <T variant="muted" style={{ fontSize: 11 }}>{last.day}</T>
      </View>
    </View>
  );
}
