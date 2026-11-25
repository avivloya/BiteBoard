import { useAudioPlayer } from 'expo-audio';
import { router } from 'expo-router';
import { type ComponentRef, type ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LightColors } from '@/constants/theme';
import { shareView } from '@/lib/share-image';
import { soundFile } from '@/lib/sounds';
import { T } from './ui';

export type Slide = { bg: string; ink?: string; body: ReactNode };
const SLIDE_MS = 4200;

/** Full-screen story slides (like Instagram stories) with music. Tap right for next, left for back. */
export function Story({ slides, music = 'upbeat', title }: { slides: Slide[]; music?: string; title: string }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const shot = useRef<ComponentRef<typeof View>>(null);
  const player = useAudioPlayer(soundFile(music));
  const bar = useSharedValue(0);

  useEffect(() => { player.loop = true; player.volume = 0.7; player.play(); return () => { try { player.pause(); } catch {} }; }, [player]);
  useEffect(() => {
    if (paused) return;
    bar.value = 0;
    bar.value = withTiming(1, { duration: SLIDE_MS, easing: Easing.linear });
    const t = setTimeout(() => setI((x) => Math.min(slides.length - 1, x + 1)), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, paused, slides.length, bar]);
  const fill = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));
  const s = slides[i];
  const ink = s.ink ?? LightColors.ink;

  return (
    <View style={{ flex: 1, backgroundColor: s.bg }}>
      <View ref={shot} collapsable={false} style={[StyleSheet.absoluteFill, { backgroundColor: s.bg }]}>
        <Animated.View key={i} entering={FadeIn.duration(450)} style={{ flex: 1, justifyContent: 'center', padding: 28 }}>{s.body}</Animated.View>
        <T style={{ position: 'absolute', bottom: 40, alignSelf: 'center', color: ink, opacity: 0.6, fontWeight: '700' }}>Snapspoon</T>
      </View>
      <Pressable style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setI((x) => Math.max(0, x - 1))} />
        <Pressable style={{ flex: 2 }} onPress={() => (i === slides.length - 1 ? router.back() : setI(i + 1))} />
      </Pressable>
      <SafeAreaView pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 12, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 4 }} pointerEvents="none">
          {slides.map((_, j) => (
            <View key={j} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)', overflow: 'hidden' }}>
              {j < i ? <View style={{ flex: 1, backgroundColor: ink }} /> : j === i ? <Animated.View style={[{ height: 3, backgroundColor: ink }, fill]} /> : null}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T style={{ color: ink, fontWeight: '700' }}>{title}</T>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            <Pressable onPress={() => shareView(shot, title)} hitSlop={10}><T style={{ color: ink, fontWeight: '700' }}>Share</T></Pressable>
            <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Close"><T style={{ color: ink, fontSize: 20 }}>✕</T></Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

export const Big = ({ children, ink = LightColors.ink, size = 56 }: { children: ReactNode; ink?: string; size?: number }) => (
  <T style={{ fontSize: size, lineHeight: size * 1.1, fontWeight: '900', color: ink, letterSpacing: -1.5 }}>{children}</T>
);
export const Small = ({ children, ink = LightColors.ink }: { children: ReactNode; ink?: string }) => (
  <T style={{ fontSize: 20, lineHeight: 27, fontWeight: '600', color: ink, opacity: 0.85 }}>{children}</T>
);
