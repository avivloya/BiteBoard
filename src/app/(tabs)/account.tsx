import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { RecipeArt } from '@/components/plate';
import { Row, Screen } from '@/components/screen';
import { Avatar, FollowCounts, refreshSocial } from '@/components/social';
import { Button, Chip, Field, Panel, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { conversations, ensureSession, saveProfile, socialConfigured } from '@/lib/social';
import { startPost } from '@/lib/recorder';
import { useSocial } from '@/lib/social-store';
import { findRecipe, useStore } from '@/lib/store';
import { streakInfo } from '@/lib/streak';
import type { Recipe } from '@/lib/types';

type Page = 0 | 1;

/** Your account: picture, name and bio, then Posts and Saved, which slide sideways. */
export default function Account() {
  const { userId, me, unread } = useSocial();
  const profile = useStore((s) => s.profile);
  const mine = useStore((s) => s.mine);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(socialConfigured && !userId);
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState<Page>(0);
  const [heights, setHeights] = useState<[number, number]>([0, 0]);

  useFocusEffect(useCallback(() => {
    if (!socialConfigured) return;
    ensureSession().then(async (id) => {
      await refreshSocial(id);
      const cs = await conversations(id).catch(() => []);
      useSocial.getState().set({ unread: cs.reduce((n, c) => n + c.unread, 0) });
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []));

  const go = (p: Page) => { setPage(p); pager.current?.scrollTo({ x: p * width, animated: true }); };
  const measure = (p: Page, h: number) => setHeights((hs) => (hs[p] === h ? hs : (p ? [hs[0], h] : [h, hs[1]])));

  const name = me?.name || profile?.name || 'You';
  const bio = me?.bio || profile?.bio || '';
  const posts = [...mine].sort((a, b) => Number(!!b.video) - Number(!!a.video));

  return (
    <Screen>
      <Row style={{ justifyContent: me ? 'space-between' : 'flex-end' }}>
        {me && (
          <Pressable onPress={() => router.push('/inbox')} accessibilityRole="button" accessibilityLabel={unread ? `Inbox, ${unread} new` : 'Inbox'} hitSlop={12}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 13l2.5-8h11L20 13v6H4z" /><Path d="M4 13h4.5l1 2h5l1-2H20" />
            </Svg>
            {unread > 0 && <View style={styles.badge}><T style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{unread}</T></View>}
          </Pressable>
        )}
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings" hitSlop={12}>
          <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={Colors.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={12} cy={12} r={3} />
            <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </Svg>
        </Pressable>
      </Row>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Pressable onPress={() => router.push('/edit-profile')} accessibilityLabel="Change profile picture">
          <Avatar p={me ?? { name, photo: profile?.photo }} size={92} />
          <View style={styles.camera}><T style={{ color: Colors.bg, fontSize: 13 }}>✎</T></View>
        </Pressable>
        <T variant="h2" style={{ marginTop: 6 }}>{name}</T>
        {!!(me?.handle || profile?.handle) && <T variant="muted">@{me?.handle ?? profile?.handle}</T>}
        {me && userId && <FollowCounts id={userId} />}
        {bio ? <T style={{ textAlign: 'center', maxWidth: 320 }}>{bio}</T> : (
          <Pressable onPress={() => router.push('/edit-profile')} hitSlop={8}><T variant="muted" style={{ fontWeight: '600' }}>+ Add a bio</T></Pressable>
        )}
        <Row style={{ marginTop: 8 }}>
          <Button title="Edit profile" onPress={() => router.push('/edit-profile')} />
          {me && <Button title="Find people" onPress={() => router.push('/people')} />}
        </Row>
      </View>

      {socialConfigured && loading && <ActivityIndicator color={Colors.accent} />}
      {socialConfigured && !loading && !me && <CreateProfile userId={userId} defaultName={profile?.name ?? ''} error={error} />}

      <View>
        <Row style={{ flexWrap: 'nowrap', gap: 0, borderBottomWidth: 1, borderBottomColor: Colors.line }}>
          {(['Posts', 'Saved'] as const).map((label, i) => (
            <Pressable key={label} onPress={() => go(i as Page)} accessibilityRole="tab" accessibilityState={{ selected: page === i }}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: page === i ? Colors.ink : 'transparent', marginBottom: -1 }}>
              <T style={{ fontWeight: '700', color: page === i ? Colors.ink : Colors.muted }}>{label}</T>
            </Pressable>
          ))}
        </Row>
        <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, height: Math.max(heights[page], 120) }}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width) as Page)}>
          <View style={{ width, padding: 16, paddingBottom: 0, alignSelf: 'flex-start' }} onLayout={(e) => measure(0, e.nativeEvent.layout.height)}>
            <Posts recipes={posts} />
          </View>
          <View style={{ width, padding: 16, paddingBottom: 0, alignSelf: 'flex-start' }} onLayout={(e) => measure(1, e.nativeEvent.layout.height)}>
            <Saved />
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

/** Three-across tiles, like a video profile. The first tile starts a new post. */
function Posts({ recipes }: { recipes: Recipe[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, borderRadius: Radius.md, overflow: 'hidden' }}>
      <Pressable onPress={startPost} accessibilityRole="button" accessibilityLabel="New post" style={[styles.tile, { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface2 }]}>
        <T style={{ fontSize: 30, color: Colors.ink }}>+</T>
        <T variant="muted" style={{ fontSize: 12, fontWeight: '600' }}>New post</T>
      </Pressable>
      {recipes.map((r) => (
        <Pressable key={r.id} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} style={styles.tile} accessibilityLabel={`${r.title}${r.video ? ', video' : ''}`}>
          <RecipeArt recipe={r} style={StyleSheet.absoluteFill} />
          {r.video && <View style={styles.mark}><T style={{ color: '#fff', fontSize: 12 }}>▶</T></View>}
          {r.shared && !r.video && <View style={styles.mark}><T style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Posted</T></View>}
        </Pressable>
      ))}
    </View>
  );
}

/** Everything you've saved, as a plain list. Filter by board at the top. */
function Saved() {
  const boards = useStore((s) => s.boards);
  const feed = useSocial((s) => s.feed);
  const forYou = useSocial((s) => s.forYou);
  const [board, setBoard] = useState<string | null>(null);
  const ids = [...new Set((board ? boards.filter((b) => b.id === board) : boards).flatMap((b) => b.ids))];
  const items = ids.map((id) => findRecipe(id, [...feed, ...forYou])).filter((r): r is Recipe => !!r);
  const where = (id: string) => boards.filter((b) => b.ids.includes(id)).map((b) => b.name).join(', ');

  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="All" selected={!board} onPress={() => setBoard(null)} />
        {boards.map((b) => <Chip key={b.id} label={b.name} selected={board === b.id} onPress={() => setBoard(b.id)} />)}
        <Chip label="Manage" onPress={() => router.push('/boards')} />
      </ScrollView>
      {items.length ? items.map((r) => (
        <Pressable key={r.id} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.tile }}>
            <RecipeArt recipe={r} style={StyleSheet.absoluteFill} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T style={{ fontWeight: '700' }} numberOfLines={1}>{r.title}</T>
            <T variant="muted" style={{ fontSize: 13 }} numberOfLines={1}>{Math.round(r.kcal)} kcal · {r.min} min{board ? '' : ` · ${where(r.id)}`}</T>
          </View>
          <T variant="muted">›</T>
        </Pressable>
      )) : <T variant="muted">Tap the bookmark on any recipe to save it here.</T>}
    </View>
  );
}

const styles = StyleSheet.create({
  camera: { position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.bg },
  badge: { position: 'absolute', top: -4, right: -8, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#E0533F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tile: { width: '32.6%', aspectRatio: 3 / 4, backgroundColor: Colors.tile },
  mark: { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.45)' },
});

function CreateProfile({ userId, defaultName, error: initialError }: { userId: string | null; defaultName: string; error: string }) {
  const days = useStore((s) => s.days);
  const [handle, setHandle] = useState(defaultName.toLowerCase().replace(/[^a-z0-9_.]/g, ''));
  const [name, setName] = useState(defaultName);
  const [bio, setBio] = useState('');
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(handle)) return setError('Handles are 3 to 20 letters, numbers, dots or underscores.');
    setBusy(true); setError('');
    try {
      const id = userId ?? (await ensureSession());
      await saveProfile(id, { handle, name: name.trim() || handle, bio: bio.trim(), streak: streakInfo(days).current });
      await refreshSocial(id);
    } catch (e) { setError(e instanceof Error ? e.message : 'Try again.'); }
    setBusy(false);
  };
  return (
    <Panel>
      <T variant="h3">Create your recipe page</T>
      <T variant="muted">People find you by your handle. Only recipes you post appear on it. Your weight and food log stay private on your phone.</T>
      <Field label="Handle" value={handle} onChangeText={setHandle} autoCapitalize="none" placeholder="john.doe" />
      <Field label="Display name" value={name} onChangeText={setName} />
      <Field label="Bio" value={bio} onChangeText={setBio} maxLength={120} placeholder="Cooking my way to my goal weight" />
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      <Button title={busy ? 'Saving…' : 'Create profile'} kind="primary" disabled={busy} onPress={save} />
    </Panel>
  );
}
