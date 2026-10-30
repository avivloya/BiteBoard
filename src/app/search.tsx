import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Masonry } from '@/components/recipe-card';
import { RecipeVideo } from '@/components/recipe-video';
import { Row } from '@/components/screen';
import { Avatar, Verified } from '@/components/social';
import { Chip, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { tr } from '@/lib/i18n';
import { LIBRARY } from '@/data/recipes';
import { tagsOf } from '@/lib/hashtags';
import { type PublicProfile, searchPeople, searchPosts, socialConfigured } from '@/lib/social';
import { useSocial } from '@/lib/social-store';
import { useStore } from '@/lib/store';
import type { Recipe } from '@/lib/types';

type Tab = 'top' | 'people' | 'videos' | 'recipes' | 'tags';
const TABS: { v: Tab; label: string }[] = [{ v: 'top', label: 'Top' }, { v: 'people', label: 'Accounts' }, { v: 'videos', label: 'Videos' }, { v: 'recipes', label: 'Recipes' }, { v: 'tags', label: 'Hashtags' }];
const RECENT = 'biteboard:recent-search';

/** Search everything: people, videos, recipes and hashtags. Start with @ for people or # for hashtags. */
export default function Search() {
  const { userId, forYou, friendIds } = useSocial();
  const mine = useStore((s) => s.mine);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('top');
  const [people, setPeople] = useState<PublicProfile[]>([]);
  const [remote, setRemote] = useState<Recipe[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => { AsyncStorage.getItem(RECENT).then((v) => setRecent(v ? JSON.parse(v) : [])).catch(() => {}); }, []);
  const remember = (x: string) => {
    const t = x.trim();
    if (t.length < 2) return;
    const next = [t, ...recent.filter((r) => r !== t)].slice(0, 8);
    setRecent(next);
    AsyncStorage.setItem(RECENT, JSON.stringify(next)).catch(() => {});
  };

  const raw = q.trim(), tagOnly = raw.startsWith('#'), atOnly = raw.startsWith('@'), term = raw.replace(/^[#@]/, '').toLowerCase();

  // Ask the server for people and posts a moment after typing stops.
  useEffect(() => {
    if (!socialConfigured || !userId || !term) { setPeople([]); setRemote([]); return; }
    const t = setTimeout(() => {
      if (!tagOnly) searchPeople(term, userId).then(setPeople).catch(() => {}); else setPeople([]);
      if (!atOnly) searchPosts(tagOnly ? `#${term}` : term).then(setRemote).catch(() => {}); else setRemote([]);
    }, 250);
    return () => clearTimeout(t);
  }, [term, tagOnly, atOnly, userId]);

  const pool = useMemo(() => {
    const seen = new Set<string>(), all: Recipe[] = [];
    for (const r of [...remote, ...forYou, ...mine, ...LIBRARY]) { const k = `${r.byId ?? ''}:${r.id}`; if (!seen.has(k)) { seen.add(k); all.push(r); } }
    return all;
  }, [remote, forYou, mine]);

  const found = useMemo(() => {
    if (!term || atOnly) return [];
    return pool.filter((r) => tagOnly ? tagsOf(r).some((x) => x.startsWith(term))
      : `${r.title} ${r.caption ?? ''} ${r.by ?? ''} ${r.ing.join(' ')} ${tagsOf(r).join(' ')}`.toLowerCase().includes(term));
  }, [pool, term, tagOnly, atOnly]);
  const videos = found.filter((r) => r.video);
  const recipes = found.filter((r) => !r.video || r.kcal > 0);
  const tags = useMemo(() => {
    const n: Record<string, number> = {};
    for (const r of pool) for (const x of tagsOf(r)) if (!term || x.includes(term)) n[x] = (n[x] ?? 0) + 1;
    return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, term ? 20 : 12);
  }, [pool, term]);
  const sortedPeople = [...people].sort((a, b) => Number(friendIds.includes(b.id)) - Number(friendIds.includes(a.id)));

  const pick = (x: string) => { setQ(x); remember(x); setTab('top'); };
  const watch = (i: number) => { remember(q); useSocial.getState().set({ watch: { posts: videos, index: i } }); router.push('/watch'); };

  const peopleList = (list: PublicProfile[]) => list.map((p) => (
    <Pressable key={p.id} onPress={() => { remember(q); router.push({ pathname: '/person/[id]', params: { id: p.id } }); }} style={s.row} accessibilityRole="button">
      <Avatar p={p} size={48} />
      <View style={{ flex: 1 }}><Row style={{ gap: 4 }}><T style={{ fontWeight: '700' }}>{p.name || p.handle}</T><Verified on={p.verified} /></Row><T variant="muted">@{p.handle}</T></View>
      {friendIds.includes(p.id) && <T variant="muted">Following</T>}
    </Pressable>
  ));
  const tagList = (list: [string, number][]) => list.map(([x, n]) => (
    <Pressable key={x} onPress={() => pick(`#${x}`)} style={s.row} accessibilityRole="button">
      <View style={s.hash}><T style={{ fontSize: 22, fontWeight: '800' }}>#</T></View>
      <View><T style={{ fontWeight: '700' }}>#{x}</T><T variant="muted">{n} post{n === 1 ? '' : 's'}</T></View>
    </Pressable>
  ));
  const videoGrid = (list: Recipe[]) => (
    <View style={s.grid}>
      {list.map((r, i) => (
        <Pressable key={`${r.byId ?? ''}:${r.id}`} onPress={() => watch(i)} style={s.vid} accessibilityRole="button" accessibilityLabel={r.caption || r.title}>
          {r.cover ? <Image source={{ uri: r.cover }} style={{ flex: 1 }} contentFit="cover" /> : <RecipeVideo uri={r.video!} controls={false} muted speed={r.speed} filter={r.filter} style={{ flex: 1 }} />}
          <View style={s.vidInfo}>{!!r.by && <T style={s.vidText}>@{r.by}</T>}<T style={[s.vidText, { fontWeight: '700' }]} numberOfLines={1}>{r.caption || r.title}</T></View>
        </Pressable>
      ))}
    </View>
  );
  const section = (label: string, more: Tab | null, body: React.ReactNode) => (
    <View style={{ gap: 6 }}>
      <Row style={{ justifyContent: 'space-between' }}><T variant="label">{label}</T>{more && <Pressable onPress={() => setTab(more)} hitSlop={8}><T variant="muted" style={{ fontWeight: '600' }}>See all</T></Pressable>}</Row>
      {body}
    </View>
  );
  const nothing = <T variant="muted" style={{ textAlign: 'center', marginTop: 30 }}>Nothing found. Try another word, an @name or a #hashtag.</T>;

  let body: React.ReactNode;
  if (!raw) {
    body = (
      <View style={{ gap: 16 }}>
        {recent.length > 0 && section('Recent', null, <Row>{recent.map((x) => <Chip key={x} label={x} onPress={() => pick(x)} />)}</Row>)}
        {tags.length > 0 && section('Popular hashtags', null, <Row>{tags.map(([x]) => <Chip key={x} label={`#${x}`} onPress={() => pick(`#${x}`)} />)}</Row>)}
      </View>
    );
  } else if (tab === 'people') body = sortedPeople.length ? peopleList(sortedPeople) : nothing;
  else if (tab === 'videos') body = videos.length ? videoGrid(videos) : nothing;
  else if (tab === 'recipes') body = recipes.length ? <Masonry recipes={recipes} /> : nothing;
  else if (tab === 'tags') body = tags.length ? tagList(tags) : nothing;
  else {
    const parts = [
      sortedPeople.length > 0 && section('Accounts', sortedPeople.length > 3 ? 'people' : null, peopleList(sortedPeople.slice(0, 3))),
      tags.length > 0 && section('Hashtags', tags.length > 3 ? 'tags' : null, tagList(tags.slice(0, 3))),
      videos.length > 0 && section('Videos', videos.length > 6 ? 'videos' : null, videoGrid(videos.slice(0, 6))),
      recipes.length > 0 && section('Recipes', recipes.length > 6 ? 'recipes' : null, <Masonry recipes={recipes.slice(0, 6)} />),
    ].filter(Boolean);
    body = parts.length ? <View style={{ gap: 18 }}>{parts}</View> : nothing;
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Row style={{ paddingHorizontal: 12, paddingTop: 8, flexWrap: 'nowrap' }}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back" style={{ padding: 4 }}>
          <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" stroke={Colors.ink} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </Pressable>
        <View style={s.box}>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Circle cx={11} cy={11} r={7} stroke={Colors.muted} strokeWidth={2} fill="none" /><Path d="m20 20-3.5-3.5" stroke={Colors.muted} strokeWidth={2} strokeLinecap="round" /></Svg>
          <TextInput value={q} onChangeText={setQ} autoFocus placeholder={tr("Search people, videos, #tags")} placeholderTextColor={Colors.muted} returnKeyType="search"
            onSubmitEditing={() => remember(q)} autoCapitalize="none" autoCorrect={false} style={s.input} />
          {!!q && <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel="Clear"><T variant="muted" style={{ fontSize: 16 }}>✕</T></Pressable>}
        </View>
      </Row>
      {!!raw && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 18, paddingHorizontal: 16, paddingVertical: 12 }}>
          {TABS.map((t) => (
            <Pressable key={t.v} onPress={() => setTab(t.v)} accessibilityRole="tab" accessibilityState={{ selected: tab === t.v }}>
              <T style={{ fontWeight: '700', fontSize: 15, color: tab === t.v ? Colors.ink : Colors.line }}>{t.label}</T>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <FlatList data={[0]} keyExtractor={() => 'b'} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: 16, paddingTop: raw ? 0 : 16, paddingBottom: 40 }} renderItem={() => <>{body}</>} />
      {!socialConfigured && !!raw && <T variant="muted" style={{ textAlign: 'center', padding: 12 }}>Searching other people works once accounts are set up.</T>}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  box: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 999, paddingHorizontal: 14 },
  input: { flex: 1, paddingVertical: 11, fontSize: 16, color: Colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  hash: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  vid: { width: '32.6%', aspectRatio: 9 / 14, borderRadius: 10, overflow: 'hidden', backgroundColor: '#120C07' },
  vidInfo: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 6, backgroundColor: 'rgba(18,12,7,0.45)' },
  vidText: { color: '#fff', fontSize: 11 },
});
