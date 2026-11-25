import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BiteyAvatar } from '@/components/bitey-avatar';
import { Row, Screen } from '@/components/screen';
import { Button, Field, Panel, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { type CoachReply, aiConfigured, askCoach } from '@/lib/ai';
import { leftToday, recipesThatFit } from '@/lib/coach';
import { useStore } from '@/lib/store';

/** "What should I eat next?" Bitey looks at what is left today and suggests meals and recipes that fit. */
export default function Coach() {
  useStore((s) => s.days);
  const { left, eaten, meal } = leftToday();
  const [prefs, setPrefs] = useState('');
  const [reply, setReply] = useState<CoachReply | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fits = recipesThatFit(left.kcal, meal);

  const ask = async () => {
    if (!aiConfigured) return;
    setBusy(true); setError('');
    try { setReply(await askCoach({ left, eaten, meal, prefs: prefs.trim() || undefined })); } catch (e) { setError(e instanceof Error ? e.message : 'Bitey could not answer. Try again.'); }
    setBusy(false);
  };
  useEffect(() => { ask(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <Row>
        <BiteyAvatar size={44} />
        <View style={{ flex: 1 }}>
          <T variant="h2">What should I eat?</T>
          <T variant="muted">{Math.round(left.kcal)} kcal and {Math.round(left.p)} g protein left for today</T>
        </View>
      </Row>

      {busy && <Row><ActivityIndicator color={Colors.accent} /><T variant="muted">Bitey is thinking about your {meal.toLowerCase()}…</T></Row>}
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      {reply && (
        <>
          <Panel><T>{reply.tip}</T></Panel>
          {reply.ideas.map((x, i) => (
            <Animated.View key={x.title} entering={FadeInDown.delay(i * 90).springify()}>
              <Panel style={{ gap: 4 }}>
                <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                  <T variant="h3" style={{ flex: 1 }}>{x.title}</T>
                  <T variant="num">{Math.round(x.kcal)} kcal</T>
                </Row>
                <T variant="muted">{Math.round(x.protein)} g protein · {x.why}</T>
                <Row>
                  <Button title="Make a recipe" kind="ghost" onPress={() => router.push({ pathname: '/ai-recipe', params: { prompt: `${x.title}, about ${Math.round(x.kcal)} kcal` } })} />
                </Row>
              </Panel>
            </Animated.View>
          ))}
        </>
      )}

      <Field label="Anything you feel like or want to avoid?" value={prefs} onChangeText={setPrefs} placeholder="Something warm, no dairy" />
      <Button title={reply ? 'Ask again' : 'Ask Bitey'} kind="primary" disabled={busy || !aiConfigured} onPress={ask} />
      {!aiConfigured && <T variant="muted">AI ideas need the AI backend. Recipes that fit are below.</T>}

      {!!fits.length && (
        <View style={{ gap: 10 }}>
          <T variant="label">Recipes that fit</T>
          {fits.map((r) => (
            <Pressable key={r.id} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })}>
              <Panel style={{ gap: 2 }}>
                <T style={{ fontWeight: '700' }}>{r.title}</T>
                <T variant="muted">{r.kcal} kcal · {r.p} g protein · {r.min} min</T>
              </Panel>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
