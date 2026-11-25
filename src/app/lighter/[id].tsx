import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row, Screen } from '@/components/screen';
import { Button, Panel, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { type Lighter, aiConfigured, lightenRecipe } from '@/lib/ai';
import { usePro } from '@/lib/pro';
import { useSocial } from '@/lib/social-store';
import { aiLeft, findRecipe, useStore } from '@/lib/store';

/** "Make it healthier": smart swaps that lighten any recipe, side by side with the original. */
export default function MakeLighter() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const feed = useSocial((s) => s.feed);
  const forYou = useSocial((s) => s.forYou);
  const recipe = findRecipe(id, [...feed, ...forYou]);
  const { addRecipe, countAiUse } = useStore();
  const isPro = usePro((s) => s.isPro);
  const [out, setOut] = useState<Lighter | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!recipe || !aiConfigured) return;
    if (!isPro && aiLeft('recipes') <= 0) { router.replace('/pro'); return; }
    const { title, cat, min, serv, kcal, p, c, f, ing, steps } = recipe;
    lightenRecipe({ title, cat, min, serv, kcal, p, c, f, ing, steps })
      .then((r) => { setOut(r); if (!isPro) countAiUse('recipes'); })
      .catch((e) => setError(e instanceof Error ? e.message : 'That did not work. Try again.'));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!recipe) return null;
  const Col = ({ label, a, b, unit = '' }: { label: string; a: number; b: number; unit?: string }) => (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <T variant="muted" style={{ fontSize: 12 }}>{label}</T>
      <T variant="num" style={{ fontSize: 13, textDecorationLine: 'line-through', color: Colors.muted }}>{Math.round(a)}{unit}</T>
      <T variant="num" style={{ fontSize: 18, fontWeight: '800' }}>{Math.round(b)}{unit}</T>
    </View>
  );

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Make it lighter</T>
      <T variant="muted">{recipe.title}</T>
      {!aiConfigured && <T variant="muted">This needs the AI backend.</T>}
      {!out && !error && aiConfigured && <Row><ActivityIndicator color={Colors.accent} /><T variant="muted">Finding smart swaps…</T></Row>}
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      {out && (
        <>
          <Panel>
            <T variant="h3">{out.title}</T>
            <Row style={{ flexWrap: 'nowrap' }}>
              <Col label="kcal" a={recipe.kcal} b={out.kcal} />
              <Col label="protein" a={recipe.p} b={out.p} unit="g" />
              <Col label="carbs" a={recipe.c} b={out.c} unit="g" />
              <Col label="fat" a={recipe.f} b={out.f} unit="g" />
            </Row>
            {recipe.kcal > out.kcal && <T style={{ color: Colors.accent, fontWeight: '700', textAlign: 'center' }}>Saves {Math.round(recipe.kcal - out.kcal)} kcal a serving</T>}
          </Panel>
          <T variant="label">Swaps</T>
          {out.swaps.map((x, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(i * 70)}><Panel><T>✓ {x}</T></Panel></Animated.View>
          ))}
          <Button title="Save the lighter recipe" kind="primary" onPress={() => {
            const { swaps: _s, ...r } = out;
            const nid = addRecipe({ ...r, ai: true, caption: `Lighter version of ${recipe.title}` });
            router.replace({ pathname: '/recipe/[id]', params: { id: nid } });
          }} />
        </>
      )}
    </Screen>
  );
}
