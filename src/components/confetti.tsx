import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withTiming, ZoomIn } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useParty } from '@/lib/celebrate';
import { T } from './ui';

const COLORS = ['#6B4026', '#C9A27C', '#E2CEB1', '#A8735A', '#F3C16B', '#E58A5C', '#FFF8EE'];

function Piece({ i, w, h }: { i: number; w: number; h: number }) {
  const p = useMemo(() => ({
    x: Math.random() * w,
    drift: (Math.random() - 0.5) * 160,
    size: 6 + Math.random() * 8,
    spin: (Math.random() - 0.5) * 1080,
    delay: Math.random() * 250,
    dur: 1600 + Math.random() * 900,
    color: COLORS[i % COLORS.length],
    round: i % 3 === 0,
  }), [i, w]);
  const t = useSharedValue(0);
  useEffect(() => { t.value = withDelay(p.delay, withTiming(1, { duration: p.dur, easing: Easing.out(Easing.quad) })); }, [p, t]);
  const st = useAnimatedStyle(() => ({
    opacity: 1 - Math.max(0, t.value - 0.75) * 4,
    transform: [{ translateX: p.drift * t.value }, { translateY: -40 + t.value * (h + 80) }, { rotate: `${p.spin * t.value}deg` }],
  }));
  return <Animated.View style={[{ position: 'absolute', left: p.x, top: 0, width: p.size, height: p.round ? p.size : p.size * 0.45, borderRadius: p.round ? 99 : 2, backgroundColor: p.color }, st]} />;
}

/** Full-screen confetti with a message card. Mounted once in the root layout. */
export function Confetti() {
  const { party, set } = useParty();
  const { width, height } = useWindowDimensions();
  useEffect(() => {
    if (!party) return;
    const timer = setTimeout(() => set(null), 2800);
    return () => clearTimeout(timer);
  }, [party, set]);
  if (!party) return null;
  return (
    <View key={party.id} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({ length: 70 }, (_, i) => <Piece key={i} i={i} w={width} h={height} />)}
      </View>
      <Animated.View entering={FadeIn} exiting={FadeOut} pointerEvents="box-none" style={{ position: 'absolute', top: height * 0.32, left: 24, right: 24, alignItems: 'center' }}>
        <Pressable onPress={() => set(null)}>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={{ backgroundColor: Colors.surface, borderRadius: 24, paddingVertical: 18, paddingHorizontal: 26, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
            <T variant="h2" style={{ textAlign: 'center' }}>{party.title}</T>
            {!!party.sub && <T variant="muted" style={{ textAlign: 'center' }}>{party.sub}</T>}
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
