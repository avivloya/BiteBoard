import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { savePushToken } from './social';

// Push notifications for likes, comments, replies, follows and messages.
// The server side is supabase/functions/notify. The phone needs an EAS project id (from `eas init`) to get a push token.
const PREF = 'biteboard:push';
let lastToken: string | null = null;

export const pushOn = async () => (await AsyncStorage.getItem(PREF).catch(() => null)) !== 'off';

/** Saves this phone's push token so the server can reach it. Asks for permission only when `ask` is true. */
export async function registerPush(userId: string, ask = false) {
  const on = await pushOn();
  const perm = await Notifications.getPermissionsAsync();
  const granted = perm.granted || (ask && on && (await Notifications.requestPermissionsAsync()).granted);
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!granted || !projectId || Platform.OS === 'web') return false;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('social', { name: 'Likes, comments and messages', importance: Notifications.AndroidImportance.HIGH });
  lastToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await savePushToken(userId, lastToken, on);
  return true;
}

export async function setPushOn(userId: string | null, on: boolean) {
  await AsyncStorage.setItem(PREF, on ? 'on' : 'off');
  if (!userId) return;
  if (lastToken) await savePushToken(userId, lastToken, on).catch(() => {});
  else if (on) await registerPush(userId, true).catch(() => {});
}

/** Tapping a notification opens what it's about: a chat, a profile or your Activity. */
export function listenForPushTaps() {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const url = r.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
  });
  return () => sub.remove();
}
