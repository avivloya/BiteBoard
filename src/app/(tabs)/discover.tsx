import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/logo';
import { Masonry } from '@/components/recipe-card';
import { Reels } from '@/components/reels';
import { Row, Screen } from '@/components/screen';
import { Button, Chip, T, styles as ui } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { FILTERS, LIBRARY } from '@/data/recipes';
import { ensureSession, forYouPosts, friendIds, socialConfigured } from '@/lib/social';
import { useSocial } from '@/lib/social-store';
import { useStore } from '@/lib/store';

type Feed = 'foryou' | 'watch' | 'recipes';

export default function Discover() {
  const mine = useStore((s) => s.mine);
  const forYou = useSocial((s) => s.forYou);
  const friends = useSocial((s) => s.friendIds);
  const [feed, setFeed] = useState<Feed>(socialConfigured ? 'foryou' : 'recipes');
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

  const term = q.trim().toLowerCase();
  const recipes = useMemo(() => [...mine, ...LIBRARY].filter(
    (r) => (filter === 'All' || r.tags.includes(filter) || r.cat === filter) &&
      (!term || `${r.title} ${r.ing.join(' ')} ${r.tags.join(' ')}`.toLowerCase().includes(term)),
  ), [mine, term, filter]);
  // Friends' posts first, then everyone else, newest first.
  const posts = useMemo(() => forYou
    .filter((r) => !term || `${r.title} ${r.ing.join(' ')} ${r.by ?? ''}`.toLowerCase().includes(term))
    .sort((a, b) => Number(friends.includes(b.byId ?? '')) - Number(friends.includes(a.byId ?? '')) || (b.posted ?? 0) - (a.posted ?? 0)),
  [forYou, friends, term]);
  // Cooking videos: posts with a video, plus your own posted ones.
  const reels = useMemo(() => [...posts, ...mine.filter((r) => r.shared)].filter((r) => r.video), [posts, mine]);

  const tab = (value: Feed, label: string) => (
    <Pressable onPress={() => { setFeed(value); setQ(''); }} accessibilityRole="tab" accessibilityState={{ selected: feed === value }}>
      <T style={{ fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: feed === value ? Colors.ink : Colors.line }}>{label}</T>
    </Pressable>
  );

  const header = (
    <>
      <Row>
        <Logo />
        <T style={{ fontSize: 22, fontWeight: '800', color: Colors.ink, letterSpacing: -0.6 }}>Biteboard</T>
      </Row>
      {socialConfigured && <Row style={{ gap: 20 }}>{tab('foryou', 'For you')}{tab('watch', 'Watch')}{tab('recipes', 'Recipes')}</Row>}
    </>
  );

  // Watch is a full-height swipe feed, so it can't live inside the page's scroll view.
  if (feed === 'watch') return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.bg, paddingHorizontal: 16, paddingTop: 16, gap: 14 }}>
      {header}
      {reels.length ? <Reels posts={reels} /> : (
        <Empty title="No cooking videos yet" body="Post a recipe with a video of you making it and it shows up here." />
      )}
      {!reels.length && <Button title="+ Post a recipe" kind="primary" onPress={() => router.push('/write-recipe')} />}
    </SafeAreaView>
  );

  return (
    <Screen style={{ gap: 14 }}>
      {header}
      <Row style={{ flexWrap: 'nowrap' }}>
        <TextInput value={q} onChangeText={setQ} placeholder={feed === 'foryou' ? 'Search posts' : 'Search healthy recipes'} placeholderTextColor={Colors.muted} returnKeyType="search"
          style={[ui.input, { flex: 1, borderRadius: 999, backgroundColor: 'rgba(248,239,226,0.7)', borderColor: 'transparent' }]} />
        {feed === 'foryou' ? <Button title="+ Post" kind="primary" onPress={() => router.push('/write-recipe')} /> : (
          <>
            <Button title="AI" kind="primary" onPress={() => router.push('/ai-recipe')} />
            <Button title="+" onPress={() => router.push('/write-recipe')} />
          </>
        )}
      </Row>

      {feed === 'foryou' ? (
        loading && !forYou.length ? <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
          : posts.length ? <Masonry recipes={posts} />
          : <Empty title={error ? "Couldn't load posts" : term ? 'No posts match' : 'No posts yet'} body={error || (term ? 'Try another search.' : 'When people post recipes, they show up here. Be the first: tap + Post.')} />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {FILTERS.map((f) => <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />)}
          </ScrollView>
          {recipes.length ? <Masonry recipes={recipes} /> : <Empty title="No recipes match" body="Try another filter, or ask AI to create one for you." />}
        </>
      )}
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
