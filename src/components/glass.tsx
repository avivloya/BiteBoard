import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';

import { Colors, isDark } from '@/constants/theme';

const liquid = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * A frosted, see-through panel. Uses Apple's Liquid Glass on iOS 26, a blur on other phones,
 * and a CSS backdrop blur on the web. Put it over food photos so the picture shows through.
 */
export function Glass({ children, style, intensity = 40, strong }: { children?: ReactNode; style?: ViewStyle | ViewStyle[]; intensity?: number; strong?: boolean }) {
  const base: ViewStyle = { overflow: 'hidden' };
  if (liquid) {
    return <GlassView glassEffectStyle={strong ? 'regular' : 'clear'} colorScheme={isDark ? 'dark' : 'light'} style={[base, style as ViewStyle]}>{children}</GlassView>;
  }
  if (Platform.OS === 'web') {
    const web = { backdropFilter: `blur(${Math.round(intensity / 3)}px)`, WebkitBackdropFilter: `blur(${Math.round(intensity / 3)}px)` } as unknown as ViewStyle;
    return <View style={[base, { backgroundColor: Colors.glass }, web, style as ViewStyle]}>{children}</View>;
  }
  return (
    <BlurView intensity={intensity} tint={isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'} style={[base, { backgroundColor: strong ? Colors.glass : 'transparent' }, style as ViewStyle]}>
      {children}
    </BlurView>
  );
}

export const hasLiquidGlass = liquid;
