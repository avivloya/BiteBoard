import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { Avatar, refreshSocial, Verified } from '@/components/social';
import { Button, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { ago } from '@/lib/ago';
import { activity, ACTIVITY_READ as READ, type ActivityItem, type PublicProfile, setFriend, socialConfigured } from '@/lib/social';
import { useSocial } from '@/lib/social-store';

const TEXT: Record<ActivityItem['type'], string> = {
  like: 'liked your video.', comment: 'commented:', reply: 'replied to your comment:', follow: 'started following you.', message: 'sent you a message:',
};

/** Everything that happened to you: likes, comments, replies, new followers and messages. */
export default function Activity() {
  const { userId, friendIds } = useSocial();
  const [data, setData] = useState<{ items: ActivityItem[]; people: Record<string, PublicProfile> } | null>(null);
  const [read, setRead] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    setRead(Number(await AsyncStorage.getItem(READ).catch(() => 0)) || 0);
    setData(await activity(userId).catch(() => ({ items: [], people: {} })));
    await AsyncStorage.setItem(READ, String(Date.now())).catch(() => {});
    useSocial.getState().set({ activityNew: 0 });
    setBusy(false);
  }, [userId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!socialConfigured || !userId) return <View style={{ flex: 1, backgroundColor: Colors.bg, padding: 20 }}><T variant="muted">Make your recipe page on Account first. Then likes, comments and followers show up here.</T></View>;
  if (!data) return <View style={{ flex: 1, backgroundColor: Colors.bg, padding: 20 }}><ActivityIndicator color={Colors.accent} /></View>;

  const open = (x: ActivityItem) => {
    if (x.type === 'message') return router.push({ pathname: '/chat/[id]', params: { id: x.by } });
    if (x.type === 'follow' || !x.post) return router.push({ pathname: '/person/[id]', params: { id: x.by } });
    router.push({ pathname: '/recipe/[id]', params: { id: x.post.split(':').slice(1).join(':') } });
  };
  const row = (x: ActivityItem, i: number) => {
    const p = data.people[x.by];
    const fresh = Date.parse(x.at) > read;
    return (
      <Pressable key={`${x.type}-${x.by}-${x.at}-${i}`} onPress={() => open(x)} accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 14, backgroundColor: fresh ? 'rgba(255,255,255,0.45)' : 'transparent' }}>
        <Avatar p={p ?? { handle: '?' }} size={44} />
        <View style={{ flex: 1 }}>
          <T>
            <T style={{ fontWeight: '700' }}>@{p?.handle ?? 'someone'}</T>{p?.verified ? ' ' : ''}{p?.verified ? <Verified on size={12} /> : null} {TEXT[x.type]}
            {!!x.text && <T variant="muted"> {x.text}</T>} <T variant="muted" style={{ fontSize: 12 }}>{ago(x.at)}</T>
          </T>
        </View>
        {x.type === 'follow' && !friendIds.includes(x.by) && (
          <Button title="Follow back" kind="primary" onPress={async () => { await setFriend(userId, x.by, true).catch(() => {}); await refreshSocial(userId).catch(() => {}); }} />
        )}
      </Pressable>
    );
  };
  const day = Date.now() - 864e5;
  const today = data.items.filter((x) => Date.parse(x.at) >= day), older = data.items.filter((x) => Date.parse(x.at) < day);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 16, gap: 6 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}>
      <T variant="h2">Activity</T>
      {!data.items.length && <T variant="muted">Nothing yet. When people like, comment on or share your posts, or follow you, it shows up here.</T>}
      {!!today.length && <><T variant="label" style={{ marginTop: 8 }}>Today</T>{today.map(row)}</>}
      {!!older.length && <><T variant="label" style={{ marginTop: 8 }}>Earlier</T>{older.map(row)}</>}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}
