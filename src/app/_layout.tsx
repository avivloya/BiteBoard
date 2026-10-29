import '@/lib/i18n';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Intro } from '@/components/intro';
import { Colors } from '@/constants/theme';
import { initPro } from '@/lib/pro';
import { syncReminders } from '@/lib/reminders';
import { useStore } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = useStore((s) => s.hydrated);
  useEffect(() => {
    if (!hydrated) return;
    SplashScreen.hideAsync();
    initPro().catch(() => {});
    syncReminders().catch(() => {});
    // Re-plan the streak saver whenever the food log changes.
    let timer: ReturnType<typeof setTimeout>;
    const unsub = useStore.subscribe((s, prev) => {
      if (s.days !== prev.days && s.reminders.streak) {
        clearTimeout(timer);
        timer = setTimeout(() => syncReminders().catch(() => {}), 1000);
      }
    });
    return () => { unsub(); clearTimeout(timer); };
  }, [hydrated]);
  if (!hydrated) return null;

  const sheet = { presentation: 'modal' as const, contentStyle: { backgroundColor: Colors.surface } };
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="recipe/[id]" options={sheet} />
        <Stack.Screen name="write-recipe" options={sheet} />
        <Stack.Screen name="ai-recipe" options={sheet} />
        <Stack.Screen name="person/[id]" options={sheet} />
        <Stack.Screen name="scan" options={sheet} />
        <Stack.Screen name="snap" options={sheet} />
        <Stack.Screen name="people" options={sheet} />
        <Stack.Screen name="weight" options={sheet} />
        <Stack.Screen name="settings" options={sheet} />
        <Stack.Screen name="edit-profile" options={sheet} />
        <Stack.Screen name="pro" options={sheet} />
        <Stack.Screen name="watch" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="search" options={{ animation: 'fade' }} />
        <Stack.Screen name="verification" options={{ headerShown: true, title: '', headerShadowVisible: false, headerStyle: { backgroundColor: Colors.surface }, headerTintColor: Colors.ink }} />
        <Stack.Screen name="inbox" options={{ headerShown: true, title: '', headerShadowVisible: false, headerStyle: { backgroundColor: Colors.bg }, headerTintColor: Colors.ink }} />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="record-video" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="boards" options={{ headerShown: true, title: '', headerShadowVisible: false, headerStyle: { backgroundColor: Colors.bg }, headerTintColor: Colors.ink }} />
        <Stack.Screen name="board/[id]" options={{ headerShown: true, title: '', headerShadowVisible: false, headerStyle: { backgroundColor: Colors.bg }, headerTintColor: Colors.ink }} />
      </Stack>
      <Intro />
    </>
  );
}
