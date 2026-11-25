import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { T } from './ui';

export function Ring({ size = 170, stroke = 14, value, max, children }: { size?: number; stroke?: number; value: number; max: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const pct = Math.min(1, max ? value / max : 0);
  // The ring fills up smoothly when food is added.
  const shown = useSharedValue(0);
  useEffect(() => { shown.value = withTiming(pct, { duration: 900, easing: Easing.out(Easing.cubic) }); }, [pct, shown]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - shown.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.surface2} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={value > max ? Colors.warn : Colors.accent} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${C} ${C}`} animatedProps={arc} />
      </Svg>
      {children}
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T style={{ fontSize: 13 }}>{label}</T>
        <T variant="num">{Math.round(value)} / {goal} g</T>
      </View>
      <View style={{ height: 8, borderRadius: 99, backgroundColor: Colors.surface2, overflow: 'hidden' }}>
        <Fill pct={Math.min(100, goal ? (value / goal) * 100 : 0)} color={color} />
      </View>
    </View>
  );
}

function Fill({ pct, color }: { pct: number; color: string }) {
  const w = useSharedValue(0);
  useEffect(() => { w.value = withSpring(pct, { damping: 18, stiffness: 120 }); }, [pct, w]);
  const st = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return <Animated.View style={[{ height: '100%', borderRadius: 99, backgroundColor: color }, st]} />;
}
