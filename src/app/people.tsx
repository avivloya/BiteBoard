import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Masonry } from '@/components/recipe-card';
import { Row, Screen } from '@/components/screen';
import { Avatar, refreshSocial } from '@/components/social';
import { Button, T, styles as ui } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { type PublicProfile, searchPeople, setFriend } from '@/lib/social';
import { useSocial } from '@/lib/social-store';

/** Find people to follow, the people you follow, and what they've posted. */
export default function People() {
  const { userId, me, friendIds: ids, people, feed } = useSocial();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId || !me) return;
    const t = setTimeout(() => searchPeople(q, userId).then(setResults).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q, userId, me]);

  if (!userId || !me) return <Screen edges={[]} bg={Colors.surface}><T variant="muted">Create your profile on the Account tab first.</T></Screen>;

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
          <T variant="muted">@{p.handle}</T>
        </View>
      </Pressable>
      <Button title={ids.includes(p.id) ? 'Following' : 'Follow'} kind={ids.includes(p.id) ? 'secondary' : 'primary'} onPress={() => toggle(p.id)} />
    </Row>
  );
  const following = ids.map((id) => people[id]).filter(Boolean);

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">People</T>
      <TextInput value={q} onChangeText={setQ} placeholder="Search by name or @handle" placeholderTextColor={Colors.muted} autoCapitalize="none" style={[ui.input, { borderRadius: 999, backgroundColor: Colors.surface2 }]} />
      {q || !following.length
        ? (results.length ? results.map(person) : <T variant="muted">{q ? 'No one matches that name yet.' : 'No one else is here yet. Invite a friend to join Biteboard.'}</T>)
        : <><T variant="label">Following</T>{following.map(person)}</>}
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      {!q && feed.length > 0 && <><T variant="label">From people you follow</T><Masonry recipes={feed} /></>}
    </Screen>
  );
}
