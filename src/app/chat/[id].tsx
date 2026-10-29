import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecipeVideo } from '@/components/recipe-video';
import { Row } from '@/components/screen';
import { Avatar } from '@/components/social';
import { Button, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { chatWith, markRead, type Message, onMessages, type PublicProfile, profilesByIds, sendMessage } from '@/lib/social';
import { ago } from '@/lib/ago';
import { useSocial } from '@/lib/social-store';
import type { Recipe } from '@/lib/types';

/** A private chat with one person. Videos they send show up as small cards you can tap to watch. */
export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, people } = useSocial();
  const [p, setP] = useState<PublicProfile | undefined>(people[id]);
  const [list, setList] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const ref = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setList(await chatWith(userId, id));
    markRead(id).catch(() => {});
  }, [userId, id]);
  useEffect(() => { load().catch(() => {}); if (!p) profilesByIds([id]).then(([x]) => setP(x)).catch(() => {}); }, [load]);
  useEffect(() => (userId ? onMessages(userId, () => { load().catch(() => {}); }) : undefined), [userId, load]);

  const send = async () => {
    const t = text.trim();
    if (!t || !userId) return;
    setText('');
    try { await sendMessage(userId, id, t); await load(); } catch (e) { setText(t); Alert.alert('Could not send', e instanceof Error ? e.message : ''); }
  };
  const watch = (m: Message) => {
    if (!m.post?.video) return;
    useSocial.getState().set({ watch: { posts: [{ ...m.post, kcal: 0, p: 0, c: 0, f: 0, min: 0, serv: 1, cat: 'Dinner', tags: [], ing: [], steps: [] } as Recipe], index: 0 } });
    router.push('/watch');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={['top', 'bottom']}>
      <Row style={{ paddingHorizontal: 16, paddingVertical: 10, flexWrap: 'nowrap' }}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back"><T style={{ fontSize: 22 }}>←</T></Pressable>
        {p && (
          <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityRole="link">
            <Avatar p={p} size={36} />
            <View><T style={{ fontWeight: '700' }}>{p.name || p.handle}</T><T variant="muted" style={{ fontSize: 12 }}>@{p.handle}</T></View>
          </Pressable>
        )}
      </Row>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList ref={ref} data={list} keyExtractor={(m) => m.id} contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1, justifyContent: 'flex-end' }}
          onContentSizeChange={() => ref.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<T variant="muted" style={{ textAlign: 'center' }}>{p ? `Say hi to @${p.handle}.` : ''}</T>}
          renderItem={({ item: m }) => {
            const me = m.sender === userId;
            return (
              <View style={[s.bubble, me ? s.me : s.them]}>
                {m.post && (
                  <Pressable onPress={() => watch(m)} style={s.post} accessibilityRole="button" accessibilityLabel="Watch video">
                    {!!m.post.video && <View style={s.thumb}><RecipeVideo uri={m.post.video} controls={false} muted filter={m.post.filter} style={{ flex: 1 }} /></View>}
                    <View style={{ flex: 1 }}>
                      {!!m.post.by && <T style={{ fontWeight: '700', color: me ? Colors.accentInk : Colors.ink }}>@{m.post.by}</T>}
                      <T style={{ color: me ? Colors.accentInk : Colors.ink }} numberOfLines={2}>{m.post.title || m.post.caption || 'Cooking video'}</T>
                    </View>
                  </Pressable>
                )}
                {!!m.body && <T style={{ color: me ? Colors.accentInk : Colors.ink }}>{m.body}</T>}
                <T style={{ fontSize: 10.5, opacity: 0.7, color: me ? Colors.accentInk : Colors.ink }}>{ago(m.created_at)}</T>
              </View>
            );
          }} />
        <Row style={{ paddingHorizontal: 16, paddingBottom: 8, flexWrap: 'nowrap' }}>
          <TextInput value={text} onChangeText={setText} placeholder="Message…" placeholderTextColor={Colors.muted} maxLength={1000} onSubmitEditing={send} returnKeyType="send" style={s.input} />
          <Button title="Send" kind="primary" disabled={!text.trim()} onPress={send} />
        </Row>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  me: { alignSelf: 'flex-end', backgroundColor: Colors.accent, borderBottomRightRadius: 6 },
  them: { alignSelf: 'flex-start', backgroundColor: Colors.surface, borderBottomLeftRadius: 6 },
  post: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 12, padding: 6 },
  thumb: { width: 54, height: 84, borderRadius: 8, overflow: 'hidden', backgroundColor: '#120C07' },
  input: { flex: 1, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: Colors.ink },
});
