import { Platform } from 'react-native';

// Biteboard palette: warm cream ground (#E2CEB1) with coffee-brown ink.
export const Colors = {
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
} as const;

export const Fonts = {
  body: Platform.select({ ios: 'System', default: 'sans-serif' }),
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
};

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const Radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;
