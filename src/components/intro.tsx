import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet } from 'react-native';

import { Logo } from '@/components/logo';
import { Colors, Fonts } from '@/constants/theme';

/** Opening screen: the logo with the name under it, then the app fades in. */
export function Intro() {
  const [done, setDone] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let off = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (off) return;
      Animated.sequence([
        Animated.timing(pop, { toValue: 1, duration: reduce ? 0 : 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(reduce ? 300 : 650),
        Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => setDone(true));
    });
    return () => { off = true; };
  }, [fade, pop]);
  if (done) return null;
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  const rise = pop.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.wrap, { opacity: fade }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={{ opacity: pop, transform: [{ scale }] }}><Logo size={96} /></Animated.View>
      <Animated.Text style={[s.name, { opacity: pop, transform: [{ translateY: rise }] }]}>Snapspoon</Animated.Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 14, zIndex: 100 },
  name: { fontFamily: Fonts.body, fontSize: 34, fontWeight: '800', letterSpacing: -1.2, color: Colors.ink },
});
