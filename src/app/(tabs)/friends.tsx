import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { Masonry } from '@/components/recipe-card';
import { Row, Screen } from '@/components/screen';
import { Button, Field, Panel, T, styles as ui } from '@/components/ui';
import { Colors } from '@/constants/theme';
import {
  type PublicProfile, ensureSession, saveProfile, searchPeople, setFriend, socialConfigured,
} from '@/lib/social';
import { Avatar, refreshSocial } from '@/components/social';
import { useSocial } from '@/lib/social-store';
import { useStore } from '@/lib/store';
import { streakInfo } from '@/lib/streak';

export default function Friends() {
  const { userId, me, friendIds: ids, people, feed } = useSocial();
  const profile = useStore((s) => s.profile);
  const mine = useStore((s) => s.mine);
  const days = useStore((s) => s.days);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(socialConfigured && !userId);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);

  useFocusEffect(useCallback(() => {
    if (!socialConfigured) return;
    ensureSession().then(refreshSocial).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []));

  useEffect(() => {
    if (!userId || !me) return;
    const t = setTimeout(() => searchPeople(q, userId).then(setResults).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q, userId, me]);

  const head = (
    <View style={{ gap: 6 }}>
      <T variant="title">Friends</T>
      <T variant="muted">Post your recipes to your own recipe page and see what your friends are cooking.</T>
    </View>
  );
  if (!socialConfigured) return <Screen>{head}<Panel><T variant="h3">Friends isn't set up yet</T><T variant="muted">Add the Supabase keys from the README to turn on profiles and friends.</T></Panel></Screen>;
  if (loading) return <Screen>{head}<ActivityIndicator color={Colors.accent} /></Screen>;
  if (!me || !userId) return <Screen>{head}<CreateProfile userId={userId} defaultName={profile?.name ?? ''} error={error} /></Screen>;

  const toggle = async (id: string) => {
    try {
      await setFriend(userId, id, !ids.includes(id));
      await refreshSocial(userId);
    } catch (e) { setError(e instanceof Error ? e.message : 'Try again.'); }
  };
  const person = (p: PublicProfile) => (
    <Row key={p.id} style={{ flexWrap: 'nowrap' }}>
      <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => router.push({ pathname: '/person/[id]', params: { id: p.id } })}>
        <Avatar p={p} />
        <View style={{ flex: 1 }}>
          <T style={{ fontWeight: '700' }} numberOfLines={1}>{p.name}</T>
          <T variant="muted">@{p.handle}{p.streak ? ` · ${p.streak} day streak` : ''}</T>
        </View>
      </Pressable>
      <Button title={ids.includes(p.id) ? 'Friends ✓' : 'Add friend'} kind={ids.includes(p.id) ? 'secondary' : 'primary'} onPress={() => toggle(p.id)} />
    </Row>
  );

  return (
    <Screen>
      {head}
      <Panel>
        <Row style={{ flexWrap: 'nowrap' }}>
          <Avatar p={me} size={56} />
          <View style={{ flex: 1 }}>
            <T variant="h3">{me.name}</T>
            <T variant="muted">@{me.handle} · {streakInfo(days).current} day streak · {mine.filter((r) => r.shared).length} posted</T>
          </View>
        </Row>
        {!!me.bio && <T>{me.bio}</T>}
        <Button title="View my recipe page" onPress={() => router.push({ pathname: '/person/[id]', params: { id: userId } })} />
      </Panel>
      <Panel>
        <T variant="label">Find friends</T>
        <TextInput value={q} onChangeText={setQ} placeholder="Search by name or @handle" placeholderTextColor={Colors.muted} autoCapitalize="none" style={[ui.input, { borderRadius: 999, backgroundColor: Colors.surface2 }]} />
        {results.length ? results.map(person) : <T variant="muted">{q ? 'No one matches that name yet.' : 'No one else is here yet. Invite a friend to join Biteboard.'}</T>}
      </Panel>
      {ids.length > 0 && <Panel><T variant="label">Your friends</T>{ids.map((id) => people[id]).filter(Boolean).map(person)}</Panel>}
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      <T variant="h2">From your friends</T>
      {feed.length ? <Masonry recipes={feed} /> : <T variant="muted">{ids.length ? "Your friends haven't posted recipes yet." : 'Add friends to see their recipes here.'}</T>}
    </Screen>
  );
}

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
      <T variant="muted">Friends find you by your handle. Only recipes you post appear on it. Your weight and food log stay private on your phone.</T>
      <Field label="Handle" value={handle} onChangeText={setHandle} autoCapitalize="none" placeholder="aviv.cooks" />
      <Field label="Display name" value={name} onChangeText={setName} />
      <Field label="Bio" value={bio} onChangeText={setBio} maxLength={120} placeholder="Cooking my way to my goal weight" />
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      <Button title={busy ? 'Saving…' : 'Create profile'} kind="primary" disabled={busy} onPress={save} />
    </Panel>
  );
}
