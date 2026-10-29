import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Masonry } from '@/components/recipe-card';
import { Reels } from '@/components/reels';
import { Row, Screen } from '@/components/screen';
import { Button, Chip, T, styles as ui } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { FILTERS, LIBRARY } from '@/data/recipes';
import { ensureSession, forYouPosts, friendIds, socialConfigured } from '@/lib/social';
import { useSocial } from '@/lib/social-store';
import { startPost } from '@/lib/recorder';
import { useStore } from '@/lib/store';

type Feed = 'watch' | 'recipes';

/** Explore: swipe through cooking videos, or browse recipes (people's posts first, then the library). */
export default function Explore() {
  const mine = useStore((s) => s.mine);
  const forYou = useSocial((s) => s.forYou);
  const friends = useSocial((s) => s.friendIds);
  const [feed, setFeed] = useState<Feed>(socialConfigured ? 'watch' : 'recipes');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');

  useFocusEffect(useCallback(() => {
    if (!socialConfigured) return;
    setLoading(true);
    ensureSession()
      .then(async (id) => {
        const [posts, ids] = await Promise.all([forYouPosts(id), friendIds(id)]);
        useSocial.getState().set({ userId: id, forYou: posts, friendIds: ids });
        setError('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load posts.'))
      .finally(() => setLoading(false));
  }, []));

  // People you follow first, then everyone else, newest first.
  const posts = useMemo(() => [...forYou].sort((a, b) =>
    Number(friends.includes(b.byId ?? '')) - Number(friends.includes(a.byId ?? '')) || (b.posted ?? 0) - (a.posted ?? 0)), [forYou, friends]);
  const reels = useMemo(() => [...posts, ...mine.filter((r) => r.shared)].filter((r) => r.video), [posts, mine]);

  const term = q.trim().toLowerCase();
  const recipes = useMemo(() => [...posts, ...mine.filter((r) => !r.shared), ...LIBRARY].filter(
    (r) => (filter === 'All' || r.tags.includes(filter) || r.cat === filter) &&
      (!term || `${r.title} ${r.ing.join(' ')} ${r.tags.join(' ')} ${r.by ?? ''}`.toLowerCase().includes(term)),
  ), [posts, mine, term, filter]);

  const add = () => Alert.alert('Add a recipe', undefined, [
    { text: 'Film a post', onPress: startPost },
    { text: 'Write a recipe', onPress: () => router.push('/write-recipe') },
    { text: 'Create one with AI', onPress: () => router.push('/ai-recipe') },
    { text: 'Cancel', style: 'cancel' },
  ]);
  const tab = (value: Feed, label: string) => (
    <Pressable onPress={() => setFeed(value)} accessibilityRole="tab" accessibilityState={{ selected: feed === value }} hitSlop={8}>
      <T style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.4, color: feed === value ? Colors.ink : Colors.line }}>{label}</T>
    </Pressable>
  );
  const header = (
    <Row style={{ justifyContent: 'space-between' }}>
      <Row style={{ gap: 18 }}>{socialConfigured && tab('watch', 'Watch')}{tab('recipes', 'Recipes')}</Row>
      <Pressable onPress={add} accessibilityRole="button" accessibilityLabel="Add a recipe" hitSlop={10}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ color: Colors.bg, fontSize: 22, lineHeight: 24, fontWeight: '600' }}>+</T>
      </Pressable>
    </Row>
  );

  // Watch is a full-height swipe feed, so it can't live inside the page's scroll view.
  if (feed === 'watch') return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.bg, paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
      {header}
      {loading && !reels.length ? <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        : reels.length ? <Reels posts={reels} />
        : <Empty title={error ? "Couldn't load videos" : 'No cooking videos yet'} body={error || 'Tap + to post a recipe and film yourself making it.'} />}
    </SafeAreaView>
  );

  return (
    <Screen style={{ gap: 14 }}>
      {header}
      <TextInput value={q} onChangeText={setQ} placeholder="Search recipes" placeholderTextColor={Colors.muted} returnKeyType="search"
        style={[ui.input, { borderRadius: 999, backgroundColor: 'rgba(248,239,226,0.7)', borderColor: 'transparent' }]} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((f) => <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />)}
      </ScrollView>
      {recipes.length ? <Masonry recipes={recipes} /> : (
        <Empty title="No recipes match" body="Try another search, or ask AI to make one." />
      )}
      {!recipes.length && <Button title="Create with AI" kind="primary" onPress={() => router.push('/ai-recipe')} />}
    </Screen>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ padding: 28, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.line, alignItems: 'center', gap: 6 }}>
      <T variant="h3">{title}</T>
      <T variant="muted" style={{ textAlign: 'center' }}>{body}</T>
    </View>
  );
}
