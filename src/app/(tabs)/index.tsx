import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { RecipeCard } from '@/components/recipe-card';
import { Row, Screen } from '@/components/screen';
import { Button, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { LIBRARY } from '@/data/recipes';
import { dayKey, guessMeal } from '@/lib/dates';
import { ensureSession, forYouPosts, socialConfigured } from '@/lib/social';
import { useSocial } from '@/lib/social-store';
import { totals, useStore } from '@/lib/store';
import { startPost } from '@/lib/recorder';
import { streakInfo } from '@/lib/streak';

/** Home: a calm overview. Calories left today, two shortcuts, and a few ideas. */
export default function Home() {
  const profile = useStore((s) => s.profile);
  const targets = useStore((s) => s.targets);
  const days = useStore((s) => s.days);
  const forYou = useSocial((s) => s.forYou);

  useFocusEffect(useCallback(() => {
    if (!socialConfigured) return;
    ensureSession()
      .then(async (id) => useSocial.getState().set({ userId: id, forYou: await forYouPosts(id, 12) }))
      .catch(() => {});
  }, []));

  const t = totals(days[dayKey()]);
  const left = Math.round(targets.kcal - t.kcal);
  const pct = Math.min(1, targets.kcal ? t.kcal / targets.kcal : 0);
  const streak = streakInfo(days).current;
  const meal = guessMeal();
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  // Posts from people first, then library ideas that fit what's left today.
  const ideas = useMemo(() => [
    ...forYou.slice(0, 4),
    ...LIBRARY.filter((r) => r.kcal <= Math.max(250, left) && (r.cat === meal || r.cat === 'Snack')),
  ].slice(0, 8), [forYou, left, meal]);

  return (
    <Screen style={{ gap: 28 }}>
      <View style={{ gap: 4, marginTop: 8 }}>
        <T variant="muted">{hello}{streak ? ` · ${streak} day streak` : ''}</T>
        <T variant="title">{profile?.name ? profile.name : 'Welcome'}</T>
      </View>

      <Pressable onPress={() => router.navigate('/today')} accessibilityRole="button" accessibilityLabel="Open the tracker" style={{ gap: 10 }}>
        <Row style={{ alignItems: 'baseline', gap: 8 }}>
          <T style={{ fontSize: 56, fontWeight: '800', color: Colors.ink, letterSpacing: -2 }}>{Math.abs(left)}</T>
          <T variant="muted">{left < 0 ? 'kcal over today' : 'kcal left today'}</T>
        </Row>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: Colors.surface2, overflow: 'hidden' }}>
          <View style={{ height: 6, width: `${pct * 100}%`, backgroundColor: left < 0 ? Colors.warn : Colors.accent }} />
        </View>
        <T variant="muted" style={{ fontSize: 13 }}>{Math.round(t.kcal)} of {targets.kcal} kcal</T>
      </Pressable>

      <Row style={{ flexWrap: 'nowrap' }}>
        <Button title="Snap a meal" kind="primary" style={{ flex: 1 }} onPress={() => router.push('/snap')} />
        <Button title="Film a post" style={{ flex: 1 }} onPress={startPost} />
      </Row>

      {ideas.length > 0 && (
        <View style={{ gap: 12 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="h3" style={{ fontSize: 19 }}>Ideas for {meal.toLowerCase()}</T>
            <Pressable onPress={() => router.navigate('/explore')} hitSlop={8}><T variant="muted" style={{ fontWeight: '600' }}>See all</T></Pressable>
          </Row>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: 16 }} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
            {ideas.map((r, i) => <View key={r.id} style={{ width: 160 }}><RecipeCard recipe={r} index={i} height={190} /></View>)}
          </ScrollView>
        </View>
      )}
    </Screen>
  );
}
