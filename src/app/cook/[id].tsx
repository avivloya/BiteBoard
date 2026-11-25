import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Row } from '@/components/screen';
import { Button, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { useSocial } from '@/lib/social-store';
import { findRecipe } from '@/lib/store';
import { useVoice } from '@/lib/voice';

const minutesIn = (step: string) => Number(step.match(/(\d+)\s*(?:-\s*\d+\s*)?(?:min|minute)/i)?.[1] ?? 0);

/** Step-by-step cooking with big text. Say "next", "back", "repeat" or "timer", so you don't touch the phone with messy hands. */
export default function Cook() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const feed = useSocial((s) => s.feed);
  const forYou = useSocial((s) => s.forYou);
  const recipe = findRecipe(id, [...feed, ...forYou]);
  const [i, setI] = useState(-1); // -1 is the ingredients page
  const [talk, setTalk] = useState(true);
  const [timer, setTimer] = useState<{ end: number; left: number } | null>(null);
  const steps = recipe?.steps ?? [];
  const at = useRef(i);
  at.current = i;

  const say = (t: string) => { if (talk) { Speech.stop(); Speech.speak(t, { rate: 0.95 }); } };
  const go = (n: number) => {
    const next = Math.max(-1, Math.min(steps.length, n));
    setI(next); haptic.tap();
    if (next === -1) say(`Ingredients: ${recipe?.ing.join(', ')}`);
    else if (next === steps.length) say('All done. Enjoy your meal!');
    else say(`Step ${next + 1}. ${steps[next]}`);
  };
  const startTimer = (min: number) => { if (min > 0) { setTimer({ end: Date.now() + min * 60_000, left: min * 60 }); say(`Timer set for ${min} minutes.`); } };

  const voice = useVoice({
    continuous: true,
    onFinal: (t) => {
      const w = t.toLowerCase();
      if (/\b(next|done|continue|okay next)\b/.test(w)) go(at.current + 1);
      else if (/\b(back|previous|go back)\b/.test(w)) go(at.current - 1);
      else if (/\b(repeat|again|what)\b/.test(w)) go(at.current);
      else if (/\btimer\b/.test(w)) startTimer(Number(w.match(/(\d+)/)?.[1]) || minutesIn(steps[at.current] ?? ''));
      else if (/\b(ingredients)\b/.test(w)) go(-1);
    },
  });
  useEffect(() => { voice.start(); return () => { voice.stop(); Speech.stop(); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Recognition stops by itself after a pause on some phones; start it again while cooking.
  useEffect(() => { if (!voice.listening && !voice.error) { const t = setTimeout(voice.start, 800); return () => clearTimeout(t); } }, [voice.listening, voice.error]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!timer) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((timer.end - Date.now()) / 1000));
      setTimer((x) => x && { ...x, left });
      if (left === 0) { clearInterval(t); haptic.warn(); say('Time is up!'); }
    }, 1000);
    return () => clearInterval(t);
  }, [timer?.end]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!recipe) return null;
  const mins = i >= 0 && i < steps.length ? minutesIn(steps[i]) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg, padding: 20, gap: 16 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close"><T style={{ fontSize: 24 }}>✕</T></Pressable>
        <T variant="label">{i < 0 ? 'Ingredients' : i >= steps.length ? 'Done' : `Step ${i + 1} of ${steps.length}`}</T>
        <Pressable onPress={() => { setTalk((v) => !v); Speech.stop(); }} hitSlop={12}><T>{talk ? '🔊' : '🔇'}</T></Pressable>
      </Row>
      <View style={{ height: 6, backgroundColor: Colors.surface2, borderRadius: 3 }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: Colors.accent, width: `${((i + 1) / (steps.length + 1)) * 100}%` }} />
      </View>

      <Animated.View key={i} entering={FadeInRight} exiting={FadeOutLeft} style={{ flex: 1, justifyContent: 'center' }}>
        {i < 0 ? (
          <View style={{ gap: 10 }}>
            <T variant="title">{recipe.title}</T>
            {recipe.ing.map((x) => <T key={x} style={{ fontSize: 20 }}>• {x}</T>)}
          </View>
        ) : i >= steps.length ? (
          <T variant="title" style={{ textAlign: 'center' }}>All done 🎉{'\n'}Enjoy!</T>
        ) : (
          <T style={{ fontSize: 30, lineHeight: 40, fontWeight: '600', color: Colors.ink }}>{steps[i]}</T>
        )}
      </Animated.View>

      {timer && (
        <Pressable onPress={() => setTimer(null)}>
          <T variant="num" style={{ fontSize: 40, textAlign: 'center', color: timer.left === 0 ? Colors.warn : Colors.ink }}>
            ⏱ {Math.floor(timer.left / 60)}:{String(timer.left % 60).padStart(2, '0')}
          </T>
        </Pressable>
      )}
      {mins > 0 && !timer && <Button title={`Start ${mins} min timer`} onPress={() => startTimer(mins)} />}

      <Row style={{ flexWrap: 'nowrap' }}>
        <Button title="Back" style={{ flex: 1 }} disabled={i < 0} onPress={() => go(i - 1)} />
        <Button title={i >= steps.length - 1 ? 'Finish' : 'Next'} kind="primary" style={{ flex: 2 }} disabled={i >= steps.length} onPress={() => go(i + 1)} />
      </Row>
      <T variant="muted" style={{ textAlign: 'center', fontSize: 12 }}>
        {voice.error ? voice.error : voice.listening ? '🎙️ Say “next”, “back”, “repeat” or “timer”' : 'Voice is starting…'}
      </T>
    </SafeAreaView>
  );
}
