import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Glass } from '@/components/glass';
import { MealResult } from '@/components/meal-result';
import { Screen } from '@/components/screen';
import { Button, T } from '@/components/ui';
import { Colors, LightColors } from '@/constants/theme';
import { type LiveGuess, type MealEstimate, aiConfigured, estimateMeal, liveGuess } from '@/lib/ai';
import { haptic } from '@/lib/haptics';
import { usePro } from '@/lib/pro';
import { aiLeft, useStore } from '@/lib/store';

// How often the preview is checked, and how many checks one session gets (each check is an AI call).
const EVERY_MS = 3500;
const MAX_FRAMES = { free: 6, pro: 40 };

/** Point the camera at food and see a calorie guess before you take the photo. */
export default function LiveSnap() {
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const isPro = usePro((s) => s.isPro);
  const { addEntry, countAiUse } = useStore();
  const [guess, setGuess] = useState<LiveGuess | null>(null);
  const [live, setLive] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MealEstimate | null>(null);
  const [error, setError] = useState('');
  const frames = useRef(0);
  const working = useRef(false);

  useEffect(() => {
    if (!ready || !live || result || !aiConfigured) return;
    const timer = setInterval(async () => {
      if (working.current || !cam.current) return;
      if (frames.current >= (isPro ? MAX_FRAMES.pro : MAX_FRAMES.free)) return setLive(false);
      working.current = true;
      try {
        const pic = await cam.current.takePictureAsync({ quality: 0.15, base64: true, shutterSound: false, skipProcessing: true });
        frames.current++;
        if (pic?.base64) {
          const g = await liveGuess(pic.base64);
          setGuess((old) => { if (g.name && (!old || old.name !== g.name)) haptic.select(); return g.name ? g : null; });
        }
      } catch {}
      working.current = false;
    }, EVERY_MS);
    return () => clearInterval(timer);
  }, [ready, live, result, isPro]);

  const snap = async () => {
    if (!cam.current) return;
    if (!isPro && aiLeft('scans') <= 0) return router.push('/pro');
    setBusy(true); setError(''); setLive(false);
    try {
      const pic = await cam.current.takePictureAsync({ quality: 0.6, base64: true });
      if (!pic?.base64) throw new Error('The photo did not save. Try again.');
      setResult(await estimateMeal(pic.base64, 'image/jpeg'));
      if (!isPro) countAiUse('scans');
      haptic.success();
    } catch (e) { setError(e instanceof Error ? e.message : 'The estimate did not come back. Try again.'); }
    setBusy(false);
  };

  if (result) {
    return (
      <Screen edges={['top']} bg={Colors.surface}>
        <MealResult result={result} onChange={setResult} onReset={() => { setResult(null); setLive(true); frames.current = 0; }}
          onAdd={(name, sum, meal) => { addEntry({ name, ...sum, meal, src: 'photo' }); router.back(); }} />
      </Screen>
    );
  }

  if (!perm?.granted) {
    return (
      <Screen edges={['top']} bg={Colors.surface}>
        <T variant="h2">Live calories</T>
        <T variant="muted">Allow the camera to see calories while you point at your plate.</T>
        <Button title="Allow camera" kind="primary" onPress={requestPerm} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" mode="picture" onCameraReady={() => setReady(true)} />
      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close"><T style={{ color: '#fff', fontSize: 26 }}>✕</T></Pressable>
          <Pressable onPress={() => { frames.current = 0; setLive((v) => !v); }}>
            <Glass strong style={{ borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12 }}>
              <T style={{ fontWeight: '700', color: LightColors.ink }}>{live ? '● Live' : 'Live paused'}</T>
            </Glass>
          </Pressable>
        </View>
        <View style={{ gap: 14, alignItems: 'center' }}>
          {guess && live && (
            <Animated.View entering={FadeIn} exiting={FadeOut} key={guess.name}>
              <Glass strong style={{ borderRadius: 22, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' }}>
                <T style={{ fontSize: 30, fontWeight: '800', color: LightColors.ink }}>~{Math.round(guess.kcal)} kcal</T>
                <T style={{ color: LightColors.muted, fontWeight: '600' }}>{guess.name}</T>
              </Glass>
            </Animated.View>
          )}
          {!aiConfigured && <T style={{ color: '#fff' }}>Live calories need the AI backend.</T>}
          {!!error && <T style={{ color: '#FFB49A' }}>{error}</T>}
          <Pressable onPress={snap} disabled={busy} accessibilityLabel="Snap and estimate"
            style={{ width: 78, height: 78, borderRadius: 39, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            {busy ? <ActivityIndicator color="#fff" /> : <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' }} />}
          </Pressable>
          <T style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>Live guesses are rough. Snap for the full breakdown.</T>
        </View>
      </SafeAreaView>
    </View>
  );
}
