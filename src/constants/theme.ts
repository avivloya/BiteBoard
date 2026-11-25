import { Appearance, Platform } from 'react-native';

import { readThemePref, type ThemePref } from '@/lib/theme-pref';

// Snapspoon palette: warm cream ground (#E2CEB1) with coffee-brown ink.
const Light = {
  bg: '#E2CEB1',
  surface: '#F8EFE2',
  surface2: '#EEDFC9',
  ink: '#4A2E1C',
  muted: '#75563F',
  line: '#CFB592',
  accent: '#6B4026',
  accentInk: '#FFF8EE',
  warn: '#B5562C',
  tile: '#EFE2CF',
  tile2: '#DCC4A3',
  protein: '#6B4026',
  carbs: '#C9A27C',
  fat: '#A8735A',
  /** see-through panel over the page or a photo */
  glass: 'rgba(248,239,226,0.7)',
  /** thin divider between rows */
  divider: 'rgba(207,181,146,0.35)',
};

// Dark mode: deep espresso ground with the same cream as ink, so it still feels like Snapspoon.
const Dark: typeof Light = {
  bg: '#1E140D',
  surface: '#2A1D13',
  surface2: '#36261A',
  ink: '#F3E4CE',
  muted: '#BFA486',
  line: '#4E3826',
  accent: '#D9AE7E',
  accentInk: '#22160E',
  warn: '#E58A5C',
  tile: '#33241A',
  tile2: '#45311F',
  protein: '#D9AE7E',
  carbs: '#A9825E',
  fat: '#C98E70',
  glass: 'rgba(54,38,26,0.72)',
  divider: 'rgba(78,56,38,0.7)',
};

// The look is picked once when the app opens (the screens read these colors while they draw).
// Changing it in Settings saves the choice and restarts the app, see setThemePref in lib/theme-pref.
const pref: ThemePref = readThemePref();
if (Platform.OS !== 'web' && pref !== 'auto') {
  try { Appearance.setColorScheme(pref); } catch {}
}
export const isDark = (pref === 'auto' ? Appearance.getColorScheme() : pref) === 'dark';
export const themePref = pref;
export const Colors = isDark ? Dark : Light;
export const LightColors = Light;

export const Fonts = {
  body: Platform.select({ ios: 'System', default: 'sans-serif' }),
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
};

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const Radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;
