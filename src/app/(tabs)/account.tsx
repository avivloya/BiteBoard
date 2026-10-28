import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { RecipeArt } from '@/components/plate';
import { Row, Screen } from '@/components/screen';
import { Avatar, FollowCounts, refreshSocial } from '@/components/social';
import { Button, Field, Panel, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { pickRecipePhoto } from '@/lib/photos';
import { ensureSession, saveProfile, setProfilePhoto, socialConfigured } from '@/lib/social';
import { useSocial } from '@/lib/social-store';
import { useStore } from '@/lib/store';
import { streakInfo } from '@/lib/streak';
import type { Recipe } from '@/lib/types';
import { Cover } from '../boards';

/** Your account: picture and profile, your posts and videos, then everything you've saved. */
export default function Account() {
  const { userId, me } = useSocial();
  const profile = useStore((s) => s.profile);
  const mine = useStore((s) => s.mine);
  const boards = useStore((s) => s.boards);
  const createBoard = useStore((s) => s.createBoard);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(socialConfigured && !userId);
  const [newBoard, setNewBoard] = useState('');

  useFocusEffect(useCallback(() => {
    if (!socialConfigured) return;
    ensureSession().then(refreshSocial).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []));

  // Only you can set your own picture: it's uploaded into your own folder.
  async function changePhoto() {
    if (!userId) return;
    const uri = await pickRecipePhoto({ aspect: [1, 1], keep: false });
    if (!uri) return;
    try {
      await setProfilePhoto(userId, uri);
      await refreshSocial(userId);
    } catch (e) {
      Alert.alert('Could not update your picture', e instanceof Error ? e.message : 'Try again.');
    }
  }

  const posts = [...mine].sort((a, b) => Number(!!b.video) - Number(!!a.video));
  const name = me?.name || profile?.name || 'You';

  return (
    <Screen>
      <Row style={{ justifyContent: 'flex-end' }}>
        {me && <Button title="Find people" kind="ghost" onPress={() => router.push('/people')} />}
        <Button title="Settings" kind="ghost" onPress={() => router.push('/settings')} />
      </Row>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Pressable onPress={changePhoto} disabled={!me} accessibilityLabel={me?.photo ? 'Change profile picture' : 'Add a profile picture'}>
          <Avatar p={me ?? { name }} size={92} />
          {me && (
            <View style={styles.plus}><T style={{ color: Colors.bg, fontSize: 16, lineHeight: 18, fontWeight: '800' }}>+</T></View>
          )}
        </Pressable>
        <T variant="h2" style={{ marginTop: 6 }}>{name}</T>
        {me && <T variant="muted">@{me.handle}</T>}
        {me && userId && <FollowCounts id={userId} />}
        {!!me?.bio && <T style={{ textAlign: 'center' }}>{me.bio}</T>}
      </View>

      {socialConfigured && loading && <ActivityIndicator color={Colors.accent} />}
      {socialConfigured && !loading && !me && <CreateProfile userId={userId} defaultName={profile?.name ?? ''} error={error} />}

      <View style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="h3">Your posts</T>
          <Button title="+ New" kind="ghost" onPress={() => router.push('/write-recipe')} />
        </Row>
        {posts.length ? <Grid recipes={posts} /> : <T variant="muted">Film yourself cooking or write a recipe, and it shows up here.</T>}
      </View>

      <View style={{ gap: 10 }}>
        <T variant="h3">Saved</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 }}>
          {boards.map((b) => (
            <Pressable key={b.id} style={{ width: '48%' }} onPress={() => router.push({ pathname: '/board/[id]', params: { id: b.id } })}>
              <Cover board={b} />
              <T style={{ fontWeight: '700', marginTop: 6 }} numberOfLines={1}>{b.name}</T>
              <T variant="muted">{b.ids.length} recipe{b.ids.length === 1 ? '' : 's'}</T>
            </Pressable>
          ))}
        </View>
        <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><Field label="New board" value={newBoard} onChangeText={setNewBoard} placeholder="Sunday meal prep" /></View>
          <Button title="Create" disabled={!newBoard.trim()} onPress={() => { createBoard(newBoard.trim()); setNewBoard(''); }} />
        </Row>
      </View>
    </Screen>
  );
}

/** Three-across tiles, like a video profile. Videos get a play mark. */
function Grid({ recipes }: { recipes: Recipe[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, borderRadius: Radius.md, overflow: 'hidden' }}>
      {recipes.map((r) => (
        <Pressable key={r.id} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} style={{ width: '32.6%', aspectRatio: 3 / 4, backgroundColor: Colors.tile }}
          accessibilityLabel={`${r.title}${r.video ? ', video' : ''}`}>
          <RecipeArt recipe={r} style={StyleSheet.absoluteFill} />
          {r.video && <View style={styles.play}><T style={{ color: '#fff', fontSize: 12 }}>▶</T></View>}
          {r.shared && !r.video && <View style={styles.play}><T style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Posted</T></View>}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  plus: { position: 'absolute', right: 0, bottom: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.bg },
  play: { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.45)' },
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
      <Field label="Handle" value={handle} onChangeText={setHandle} autoCapitalize="none" placeholder="aviv.cooks" />
      <Field label="Display name" value={name} onChangeText={setName} />
      <Field label="Bio" value={bio} onChangeText={setBio} maxLength={120} placeholder="Cooking my way to my goal weight" />
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      <Button title={busy ? 'Saving…' : 'Create profile'} kind="primary" disabled={busy} onPress={save} />
    </Panel>
  );
}
