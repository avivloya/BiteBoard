import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { RecipeCard } from '@/components/recipe-card';
import { Ring } from '@/components/ring';
import { Row, Screen } from '@/components/screen';
import { Panel, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { LIBRARY } from '@/data/recipes';
import { dayKey, guessMeal } from '@/lib/dates';
import { ensureSession, forYouPosts, socialConfigured } from '@/lib/social';
import { useSocial } from '@/lib/social-store';
import { totals, useStore } from '@/lib/store';
import { streakInfo } from '@/lib/streak';
import { Cover } from '../boards';

const QUICK: { label: string; href: Href; icon: string }[] = [
  { label: 'Snap a meal', href: '/snap', icon: 'M4 8h3l2-3h6l2 3h3v11H4z' },
  { label: 'Create with AI', href: '/ai-recipe', icon: 'M12 2l2.2 6.3L20 10l-5.8 1.8L12 18l-2.2-6.2L4 10l5.8-1.7z' },
  { label: 'Post a recipe', href: '/write-recipe', icon: 'M12 5v14M5 12h14' },
  { label: 'Log weight', href: '/weight', icon: 'M5 20h14l-2-11H7zM9 9a3 3 0 0 1 6 0' },
];

/** Home: a bit of everything — today's calories, streak, shortcuts, new posts, ideas and boards. */
export default function Home() {
  const profile = useStore((s) => s.profile);
  const targets = useStore((s) => s.targets);
  const days = useStore((s) => s.days);
  const boards = useStore((s) => s.boards);
  const forYou = useSocial((s) => s.forYou);

  useFocusEffect(useCallback(() => {
    if (!socialConfigured) return;
    ensureSession()
      .then(async (id) => useSocial.getState().set({ userId: id, forYou: await forYouPosts(id, 12) }))
      .catch(() => {});
  }, []));

  const t = totals(days[dayKey()]);
  const left = Math.round(targets.kcal - t.kcal);
  const streak = streakInfo(days);
  const meal = guessMeal();
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const ideas = useMemo(() => LIBRARY.filter((r) => r.kcal <= Math.max(250, left) && (r.cat === meal || r.cat === 'Snack')).slice(0, 6), [left, meal]);

  return (
    <Screen>
      <T variant="title">{hello}{profile?.name ? `, ${profile.name}` : ''}</T>

      <Row style={{ flexWrap: 'nowrap', alignItems: 'stretch' }}>
        <Pressable onPress={() => router.push('/today')} style={{ flex: 1.5 }}>
          <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <Ring size={56} stroke={7} value={t.kcal} max={targets.kcal} />
            <View style={{ flex: 1 }}>
              <T variant="num" style={{ fontSize: 24 }}>{Math.abs(left)}</T>
              <T variant="muted">{left < 0 ? 'kcal over today' : 'kcal left today'}</T>
            </View>
          </Panel>
        </Pressable>
        <Pressable onPress={() => router.push('/today')} style={{ flex: 1 }}>
          <Panel style={{ justifyContent: 'center', flex: 1 }}>
            <T variant="num" style={{ fontSize: 24, color: streak.today ? Colors.warn : Colors.ink }}>{streak.current}</T>
            <T variant="muted">day streak</T>
          </Panel>
        </Pressable>
      </Row>

      <Row style={{ flexWrap: 'nowrap' }}>
        {QUICK.map((q) => (
          <Pressable key={q.label} onPress={() => router.push(q.href)} accessibilityRole="button"
            style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 18, backgroundColor: 'rgba(248,239,226,0.7)', opacity: pressed ? 0.8 : 1 })}>
            <Svg width={22} height={22} viewBox="0 0 24 24"><Path d={q.icon} stroke={Colors.ink} strokeWidth={2} fill="none" strokeLinejoin="round" /></Svg>
            <T style={{ fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{q.label}</T>
          </Pressable>
        ))}
      </Row>

      {forYou.length > 0 && <Shelf title="New on For you" onAll={() => router.push('/discover')}>{forYou.slice(0, 6).map((r, i) => <View key={r.id} style={{ width: 170 }}><RecipeCard recipe={r} index={i} height={200} /></View>)}</Shelf>}
      {ideas.length > 0 && <Shelf title={`Ideas for ${meal.toLowerCase()}`} onAll={() => router.push('/discover')}>{ideas.map((r, i) => <View key={r.id} style={{ width: 170 }}><RecipeCard recipe={r} index={i} height={200} /></View>)}</Shelf>}
      <Shelf title="Your boards" onAll={() => router.push('/boards')}>
        {boards.map((b) => (
          <Pressable key={b.id} onPress={() => router.push({ pathname: '/board/[id]', params: { id: b.id } })} style={{ width: 200, gap: 6 }}>
            <Cover board={b} />
            <T style={{ fontWeight: '700' }} numberOfLines={1}>{b.name}</T>
            <T variant="muted">{b.ids.length} recipe{b.ids.length === 1 ? '' : 's'}</T>
          </Pressable>
        ))}
      </Shelf>
    </Screen>
  );
}

function Shelf({ title, onAll, children }: { title: string; onAll: () => void; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="h3" style={{ fontSize: 19 }}>{title}</T>
        <Pressable onPress={onAll} hitSlop={8}><T variant="muted" style={{ fontWeight: '600' }}>See all</T></Pressable>
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, alignItems: 'flex-start' }} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
        {children}
        <View style={{ width: 16, borderRadius: Radius.sm }} />
      </ScrollView>
    </View>
  );
}
