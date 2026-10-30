import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { T } from './ui';

export function Ring({ size = 170, stroke = 14, value, max, children }: { size?: number; stroke?: number; value: number; max: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const pct = Math.min(1, max ? value / max : 0);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.surface2} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={value > max ? Colors.warn : Colors.accent} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${C * pct} ${C}`} />
      </Svg>
      {children}
    </View>
  );
}

export function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T style={{ fontSize: 13 }}>{label}</T>
        <T variant="num">{Math.round(value)} / {goal} g</T>
      </View>
      <View style={{ height: 8, borderRadius: 99, backgroundColor: Colors.surface2, overflow: 'hidden' }}>
        <View style={{ width: `${Math.min(100, goal ? (value / goal) * 100 : 0)}%`, height: '100%', borderRadius: 99, backgroundColor: color }} />
      </View>
    </View>
  );
}
