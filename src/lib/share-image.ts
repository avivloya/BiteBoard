import * as Sharing from 'expo-sharing';
import type { ComponentRef, RefObject } from 'react';
import { Alert, Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/** Turns a view into a picture and opens the share sheet (Instagram, WhatsApp, Messages, save to Photos…). */
export async function shareView(ref: RefObject<ComponentRef<typeof View> | null>, title = 'My Snapspoon progress') {
  if (Platform.OS === 'web') return Alert.alert('Share from the app', 'Sharing pictures works in the Snapspoon app on your phone.');
  if (!ref.current) return;
  try {
    const uri = await captureRef(ref as never, { format: 'png', quality: 1, result: 'tmpfile' });
    if (!(await Sharing.isAvailableAsync())) return Alert.alert('Sharing is not available on this phone');
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: title, UTI: 'public.png' });
  } catch {
    Alert.alert('Could not share', 'Try again in a moment.');
  }
}
