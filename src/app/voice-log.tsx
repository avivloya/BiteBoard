import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { MealResult } from '@/components/meal-result';
import { Screen } from '@/components/screen';
import { Button, Field, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { type MealEstimate, aiConfigured, estimateText } from '@/lib/ai';
import { useStore } from '@/lib/store';
import { useVoice } from '@/lib/voice';

/** "I had a turkey sandwich and an apple": say it (or type it) and AI splits it into foods with calories. */
export default function VoiceLog() {
  const { say } = useLocalSearchParams<{ say?: string }>();
  const addEntry = useStore((s) => s.addEntry);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MealEstimate | null>(null);

  const estimate = async (what: string) => {
    if (!what.trim()) return;
    setBusy(true); setError('');
    try { setResult(await estimateText(what)); } catch (e) { setError(e instanceof Error ? e.message : 'That did not work. Try again.'); }
    setBusy(false);
  };
  const voice = useVoice({ onFinal: estimate });
  useEffect(() => { if (say) { voice.setText(say); estimate(say); } }, [say]); // eslint-disable-line react-hooks/exhaustive-deps

  const pulse = useSharedValue(1);
  useEffect(() => { pulse.value = voice.listening ? withRepeat(withTiming(1.15, { duration: 600 }), -1, true) : withTiming(1); }, [voice.listening, pulse]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Log by voice</T>
      {!result && (
        <>
          <T variant="muted">Tap the mic and say what you ate, like “two eggs on toast and a latte”.</T>
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Pressable onPress={voice.listening ? voice.stop : voice.start} accessibilityLabel={voice.listening ? 'Stop listening' : 'Start listening'}>
              <Animated.View style={[{ width: 120, height: 120, borderRadius: 60, backgroundColor: voice.listening ? Colors.warn : Colors.accent, alignItems: 'center', justifyContent: 'center' }, ring]}>
                <T style={{ fontSize: 44 }}>🎙️</T>
              </Animated.View>
            </Pressable>
            <T variant="muted" style={{ marginTop: 10 }}>{voice.listening ? 'Listening… tap to stop' : 'Tap to talk'}</T>
          </View>
          <Field label="Or type it" value={voice.text} onChangeText={voice.setText} placeholder="Chicken salad and a diet coke" multiline />
          <Button title={busy ? 'Working it out…' : 'Estimate calories'} kind="primary" disabled={busy || !voice.text.trim() || !aiConfigured} onPress={() => estimate(voice.text)}
            icon={busy ? <ActivityIndicator color={Colors.accentInk} /> : undefined} />
        </>
      )}
      {!!(error || voice.error) && <T style={{ color: Colors.warn }}>{error || voice.error}</T>}
      {result && (
        <MealResult result={result} onChange={setResult} onReset={() => { setResult(null); voice.setText(''); }}
          onAdd={(name, sum, meal) => { addEntry({ name, ...sum, meal, src: 'manual' }); router.back(); }} />
      )}
    </Screen>
  );
}
