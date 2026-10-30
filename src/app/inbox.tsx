import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { BiteyAvatar } from '@/components/bitey-avatar';
import { Avatar } from '@/components/social';
import { T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { conversations, type Message, onMessages, type PublicProfile, profilesByIds, socialConfigured } from '@/lib/social';
import { ago } from '@/lib/ago';
import { useSocial } from '@/lib/social-store';


type Convo = { other: string; last: Message; unread: number };

const BiteyRow = () => (
  <Pressable onPress={() => router.push('/bitey')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.45)' }}>
    <BiteyAvatar size={48} />
    <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>Bitey</T><T variant="muted" numberOfLines={1}>Your Biteboard helper. Ask me anything about the app.</T></View>
  </Pressable>
);

/** Your messages: one row per person, newest first, plus people you follow to start a chat with. */
export default function Inbox() {
  const { userId, friendIds, people } = useSocial();
  const [list, setList] = useState<Convo[] | null>(null);
  const [who, setWho] = useState<Record<string, PublicProfile>>({});

  const load = useCallback(async () => {
    if (!userId) return;
    const cs = await conversations(userId);
    const missing = cs.map((c) => c.other).filter((id) => !people[id]);
    const found = missing.length ? await profilesByIds(missing) : [];
    setWho((w) => ({ ...w, ...Object.fromEntries(found.map((p) => [p.id, p])) }));
    setList(cs);
    useSocial.getState().set({ unread: cs.reduce((n, c) => n + c.unread, 0) });
  }, [userId, people]);
  useFocusEffect(useCallback(() => { load().catch(() => setList([])); }, [load]));
  useEffect(() => (userId ? onMessages(userId, () => { load().catch(() => {}); }) : undefined), [userId, load]);

  if (!socialConfigured || !userId) {
    return (
      <Screen>
        <T variant="h2">Inbox</T>
        <BiteyRow />
        <T variant="muted">Make your recipe page on Account first, then you can message people you follow.</T>
      </Screen>
    );
  }
  const person = (id: string) => people[id] ?? who[id];
  const start = friendIds.filter((id) => people[id] && !list?.some((c) => c.other === id));
  return (
    <Screen>
      <T variant="h2">Inbox</T>
      <BiteyRow />
      {!list ? <ActivityIndicator color={Colors.accent} /> : list.length ? (
        <View style={{ gap: 4 }}>
          {list.filter((c) => person(c.other)).map((c) => (
            <Pressable key={c.other} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.other } })} accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <Avatar p={person(c.other)!} size={48} />
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: c.unread ? '800' : '600' }}>{person(c.other)!.name || person(c.other)!.handle}</T>
                <T variant="muted" numberOfLines={1}>{c.last.sender === userId ? 'You: ' : ''}{c.last.body || 'Sent a video'} · {ago(c.last.created_at)}</T>
              </View>
              {c.unread > 0 && <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#E0533F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><T style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{c.unread}</T></View>}
            </Pressable>
          ))}
        </View>
      ) : <T variant="muted">No messages yet. Send someone a video from Watch, or start a chat below.</T>}
      {start.length > 0 && (
        <>
          <T variant="label">Start a chat</T>
          <Row style={{ gap: 14 }}>
            {start.map((id) => (
              <Pressable key={id} onPress={() => router.push({ pathname: '/chat/[id]', params: { id } })} style={{ alignItems: 'center', gap: 6, width: 64 }} accessibilityRole="button">
                <Avatar p={people[id]} size={52} />
                <T style={{ fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{people[id].name || people[id].handle}</T>
              </Pressable>
            ))}
          </Row>
        </>
      )}
    </Screen>
  );
}
