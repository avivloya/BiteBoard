import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Avatar, refreshSocial, Verified } from '@/components/social';
import { Button, Segmented, T, styles as ui } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { tr } from '@/lib/i18n';
import { followerIds, friendIds, type PublicProfile, profilesByIds, setFriend } from '@/lib/social';
import { useSocial } from '@/lib/social-store';

type Tab = 'following' | 'followers';

/** Who someone follows and who follows them, with a search bar. */
export default function Follows() {
  const params = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const { userId, friendIds: mine } = useSocial();
  const [tab, setTab] = useState<Tab>(params.tab === 'followers' ? 'followers' : 'following');
  const [lists, setLists] = useState<Record<Tab, PublicProfile[]> | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!params.id) return;
    (async () => {
      const [a, b] = await Promise.all([friendIds(params.id), followerIds(params.id)]);
      const ps = await profilesByIds([...new Set([...a, ...b])]);
      const by = Object.fromEntries(ps.map((p) => [p.id, p]));
      setLists({ following: a.map((x) => by[x]).filter(Boolean), followers: b.map((x) => by[x]).filter(Boolean) });
    })().catch(() => setLists({ following: [], followers: [] }));
  }, [params.id]);

  const toggle = async (id: string) => {
    if (!userId) return;
    await setFriend(userId, id, !mine.includes(id)).catch(() => {});
    await refreshSocial(userId).catch(() => {});
  };

  const term = q.trim().toLowerCase().replace(/^@/, '');
  const list = (lists?.[tab] ?? []).filter((p) => !term || `${p.handle} ${p.name}`.toLowerCase().includes(term));

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <Segmented
        options={[{ value: 'following', label: `${tr('Following')} ${lists?.following.length ?? ''}`.trim() }, { value: 'followers', label: `${tr('Followers')} ${lists?.followers.length ?? ''}`.trim() }]}
        value={tab} onChange={setTab} />
      <TextInput value={q} onChangeText={setQ} placeholder={tr('Search')} placeholderTextColor={Colors.muted} autoCapitalize="none" autoCorrect={false}
        style={[ui.input, { borderRadius: 999, backgroundColor: Colors.surface2 }]} accessibilityLabel="Search people" />
      {!lists ? <ActivityIndicator color={Colors.accent} /> : list.length ? list.map((p) => (
        <Row key={p.id} style={{ flexWrap: 'nowrap' }}>
          <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => router.push({ pathname: '/person/[id]', params: { id: p.id } })}>
            <Avatar p={p} />
            <View style={{ flex: 1 }}>
              <Row style={{ gap: 4, flexWrap: 'nowrap' }}><T style={{ fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>{p.name || p.handle}</T><Verified on={p.verified} /></Row>
              <T variant="muted">@{p.handle}{p.id === userId ? ' · You' : ''}</T>
            </View>
          </Pressable>
          {p.id !== userId && <Button title={mine.includes(p.id) ? 'Following' : 'Follow'} kind={mine.includes(p.id) ? 'secondary' : 'primary'} onPress={() => toggle(p.id)} />}
        </Row>
      )) : <T variant="muted" style={{ textAlign: 'center', marginTop: 16 }}>{term ? 'No one matches that.' : tab === 'following' ? 'Not following anyone yet.' : 'No followers yet.'}</T>}
    </Screen>
  );
}
