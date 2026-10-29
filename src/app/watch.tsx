import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, Share, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { RecipeVideo } from '@/components/recipe-video';
import { Row } from '@/components/screen';
import { Avatar } from '@/components/social';
import { Button, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { SHARE_URL } from '@/constants/app';
import {
  addComment, type Comment, commentCounts, commentsOn, deleteComment, likesFor, postKey, sendMessage, setLike, sharedPost, socialConfigured,
} from '@/lib/social';
import { ago } from '@/lib/ago';
import { useSocial } from '@/lib/social-store';
import type { Recipe } from '@/lib/types';


function Icon({ d, fill = 'none', color = '#fff', size = 30 }: { d: string; fill?: string; color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={d} fill={fill} stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
const HEART = 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z';
const CHAT = 'M4 5h16v11H9l-5 4z';
const SEND = 'M21 3 10 14M21 3l-7 18-4-7-7-4z';
const LIKED = '#FF6B5E';

/** Full-screen videos from Watch: swipe up and down, with like, comment and share down the side. */
export default function Watch() {
  const { posts, index } = useSocial((s) => s.watch);
  const { userId, people, friendIds } = useSocial();
  const { width, height } = useWindowDimensions();
  const [current, setCurrent] = useState(index);
  const [paused, setPaused] = useState(false);
  const [likes, setLikes] = useState<{ counts: Record<string, number>; mine: Set<string> }>({ counts: {}, mine: new Set() });
  const [comments, setComments] = useState<Record<string, number>>({});
  const [sheet, setSheet] = useState<'comments' | 'share' | null>(null);
  const keys = posts.map((r) => postKey(r, userId));
  const signedIn = socialConfigured && !!userId;

  useEffect(() => {
    if (!signedIn) return;
    likesFor(keys, userId!).then(setLikes).catch(() => {});
    commentCounts(keys).then(setComments).catch(() => {});
  }, [signedIn, keys.join()]);

  const onViewable = useRef(({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
    const i = viewableItems[0]?.index;
    if (i != null) { setCurrent(i); setPaused(false); }
  }).current;

  const like = async (r: Recipe) => {
    if (!signedIn) return Alert.alert('Likes need an account', 'Make your recipe page on Account first.');
    const k = postKey(r, userId), on = !likes.mine.has(k);
    const mine = new Set(likes.mine);
    if (on) mine.add(k); else mine.delete(k);
    setLikes({ mine, counts: { ...likes.counts, [k]: Math.max(0, (likes.counts[k] ?? 0) + (on ? 1 : -1)) } });
    setLike(k, userId!, on).catch(() => likesFor(keys, userId!).then(setLikes));
  };

  const item = useCallback(({ item: r, index: i }: { item: Recipe; index: number }) => {
    const k = postKey(r, userId), liked = likes.mine.has(k), n = likes.counts[k] ?? 0, c = comments[k] ?? 0;
    const author = r.byId ? people[r.byId] : undefined;
    return (
      <View style={{ width, height, backgroundColor: '#120C07' }}>
        <RecipeVideo uri={r.video!} autoPlay active={i === current && !paused && !sheet} muted={false} controls={false} speed={r.speed} trim={r.trim} cuts={r.cuts} filter={r.filter} style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setPaused(!paused)} accessibilityLabel={paused ? 'Play' : 'Pause'} />
        {paused && i === current && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}><Icon d="M8 5v14l11-7z" fill="rgba(255,255,255,0.85)" color="rgba(255,255,255,0.85)" size={54} /></View>}
        <View pointerEvents="none" style={s.shade} />

        <SafeAreaView edges={['bottom']} style={s.info} pointerEvents="box-none">
          {!!r.by && (
            <Pressable onPress={() => { router.back(); if (r.byId) router.push({ pathname: '/person/[id]', params: { id: r.byId } }); }} accessibilityRole="link">
              <Row>{author && <Avatar p={author} size={28} />}<T style={{ color: '#fff', fontWeight: '800' }}>@{r.by}</T></Row>
            </Pressable>
          )}
          {!!r.title && r.title !== r.caption && <T variant="h3" style={{ color: '#fff' }}>{r.title}</T>}
          {!!r.caption && <T style={{ color: '#fff' }} numberOfLines={3}>{r.caption}</T>}
          {r.kcal > 0 && (
            <Pressable onPress={() => { router.back(); router.push({ pathname: '/recipe/[id]', params: { id: r.id } }); }} style={s.recipe} accessibilityRole="button">
              <T style={{ color: Colors.ink, fontWeight: '700', fontSize: 13 }}>View recipe · {Math.round(r.kcal)} kcal</T>
            </Pressable>
          )}
        </SafeAreaView>

        <SafeAreaView edges={['bottom']} style={s.rail} pointerEvents="box-none">
          <Pressable onPress={() => like(r)} style={s.btn} accessibilityRole="button" accessibilityLabel="Like" accessibilityState={{ selected: liked }}>
            <Icon d={HEART} fill={liked ? LIKED : 'none'} color={liked ? LIKED : '#fff'} />
            <T style={s.btnText}>{n || 'Like'}</T>
          </Pressable>
          <Pressable onPress={() => setSheet('comments')} style={s.btn} accessibilityRole="button" accessibilityLabel="Comments">
            <Icon d={CHAT} /><T style={s.btnText}>{c || 'Comment'}</T>
          </Pressable>
          <Pressable onPress={() => setSheet('share')} style={s.btn} accessibilityRole="button" accessibilityLabel="Share">
            <Icon d={SEND} size={28} /><T style={s.btnText}>Share</T>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }, [width, height, current, paused, sheet, likes, comments, people, userId]);

  const post = posts[current];
  if (!posts.length) return <View style={{ flex: 1, backgroundColor: '#120C07' }} />;
  return (
    <View style={{ flex: 1, backgroundColor: '#120C07' }}>
      <FlatList data={posts} keyExtractor={(r, i) => `${r.byId ?? ''}:${r.id}:${i}`} renderItem={item} pagingEnabled showsVerticalScrollIndicator={false}
        initialScrollIndex={index} getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
        onViewableItemsChanged={onViewable} viewabilityConfig={{ itemVisiblePercentThreshold: 60 }} windowSize={3} initialNumToRender={1} maxToRenderPerBatch={2} />
      <SafeAreaView edges={['top']} style={s.top} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} style={s.x} accessibilityRole="button" accessibilityLabel="Close"><Icon d="M6 6l12 12M18 6L6 18" size={22} /></Pressable>
      </SafeAreaView>

      {post && sheet === 'comments' && (
        <Comments postId={postKey(post, userId)} signedIn={signedIn} userId={userId} onClose={() => setSheet(null)}
          onCount={(n) => setComments((c) => ({ ...c, [postKey(post, userId)]: n }))} />
      )}
      {post && sheet === 'share' && (
        <Sheet onClose={() => setSheet(null)} title="Send to">
          <SendTo post={post} userId={signedIn ? userId : null} friendIds={friendIds} people={people} />
          <Button title="Share outside Biteboard" onPress={() => Share.share({ message: `${post.title || 'A cooking video'} on Biteboard${SHARE_URL ? ` ${SHARE_URL}` : ''}` }).catch(() => {})} />
        </Sheet>
      )}
    </View>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <SafeAreaView edges={['bottom']} style={s.sheet}>
          <View style={s.grab} />
          <T style={{ textAlign: 'center', fontWeight: '700' }}>{title}</T>
          {children}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Comments({ postId, signedIn, userId, onClose, onCount }: { postId: string; signedIn: boolean; userId: string | null; onClose: () => void; onCount: (n: number) => void }) {
  const [list, setList] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const load = () => commentsOn(postId).then((l) => { setList(l); onCount(l.length); }).catch(() => setList([]));
  useEffect(() => { if (signedIn) load(); else setList([]); }, [postId]);
  const post = async () => {
    const t = text.trim();
    if (!t || !userId) return;
    setText('');
    try { await addComment(postId, userId, t); load(); } catch (e) { Alert.alert('Could not post your comment', e instanceof Error ? e.message : ''); }
  };
  return (
    <Sheet onClose={onClose} title={list ? `${list.length} comment${list.length === 1 ? '' : 's'}` : 'Comments'}>
      <FlatList style={{ maxHeight: 360 }} data={list ?? []} keyExtractor={(c) => c.id}
        ListEmptyComponent={<T variant="muted" style={{ textAlign: 'center', paddingVertical: 20 }}>{signedIn ? 'No comments yet. Say something nice.' : 'Comments need an account. Make your recipe page on Account first.'}</T>}
        renderItem={({ item: c }) => (
          <Row style={{ alignItems: 'flex-start', flexWrap: 'nowrap', paddingVertical: 6 }}>
            <Avatar p={c.author ?? { handle: '?' }} size={32} />
            <View style={{ flex: 1 }}>
              <T><T style={{ fontWeight: '700' }}>@{c.author?.handle ?? 'someone'}</T> <T variant="muted">{ago(c.created_at)}</T></T>
              <T>{c.body}</T>
            </View>
            {c.user_id === userId && <Pressable onPress={() => deleteComment(c.id).then(load)} hitSlop={8}><T variant="muted">Delete</T></Pressable>}
          </Row>
        )} />
      {signedIn && (
        <Row style={{ flexWrap: 'nowrap' }}>
          <TextInput value={text} onChangeText={setText} placeholder="Add a comment…" placeholderTextColor={Colors.muted} maxLength={300} onSubmitEditing={post} returnKeyType="send" style={s.input} />
          <Button title="Post" kind="primary" disabled={!text.trim()} onPress={post} />
        </Row>
      )}
    </Sheet>
  );
}

/** People you follow, to send this video to. It lands in their Inbox. */
function SendTo({ post, userId, friendIds, people }: { post: Recipe; userId: string | null; friendIds: string[]; people: Record<string, { name: string; handle: string; photo?: string | null }> }) {
  const [sent, setSent] = useState<Set<string>>(new Set());
  if (!userId) return <T variant="muted">Sending to friends needs an account. Make your recipe page on Account first.</T>;
  const list = friendIds.filter((id) => people[id]);
  if (!list.length) return <T variant="muted">Follow people to send them videos.</T>;
  return (
    <FlatList horizontal data={list} keyExtractor={(id) => id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 4 }}
      renderItem={({ item: id }) => (
        <Pressable disabled={sent.has(id)} style={{ alignItems: 'center', gap: 6, width: 64, opacity: sent.has(id) ? 0.6 : 1 }} accessibilityRole="button" accessibilityLabel={`Send to ${people[id].name || people[id].handle}`}
          onPress={() => sendMessage(userId, id, '', sharedPost(post)).then(() => setSent(new Set(sent).add(id))).catch((e) => Alert.alert('Could not send', e instanceof Error ? e.message : ''))}>
          <Avatar p={people[id]} size={52} />
          <T style={{ fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{sent.has(id) ? 'Sent ✓' : people[id].name || people[id].handle}</T>
        </Pressable>
      )} />
  );
}

const s = StyleSheet.create({
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%', backgroundColor: 'rgba(18,12,7,0.35)' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 14, paddingTop: 10 },
  x: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  info: { position: 'absolute', left: 16, right: 84, bottom: 18, gap: 6, alignItems: 'flex-start' },
  recipe: { backgroundColor: Colors.bg, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  rail: { position: 'absolute', right: 10, bottom: 26, gap: 18, alignItems: 'center' },
  btn: { alignItems: 'center', gap: 3, width: 60 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 12 },
  grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.line, alignSelf: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.bg, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: Colors.ink },
});
