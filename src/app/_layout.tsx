import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { useStore } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = useStore((s) => s.hydrated);
  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
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
        <Stack.Screen name="board/[id]" options={{ headerShown: true, title: '', headerShadowVisible: false, headerStyle: { backgroundColor: Colors.bg }, headerTintColor: Colors.ink }} />
      </Stack>
    </>
  );
}
