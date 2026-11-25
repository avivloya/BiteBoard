import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Small vibrations for taps and wins. Quietly does nothing on the web or on phones without a vibration motor.
const on = Platform.OS !== 'web';
const safe = (p: () => Promise<void>) => { if (on) p().catch(() => {}); };

export const haptic = {
  /** a light tick, for presses and toggles */
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** something picked from a list */
  select: () => safe(() => Haptics.selectionAsync()),
  /** food logged, goal hit, streak kept */
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** went over the calorie goal */
  warn: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
