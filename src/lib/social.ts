import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { File } from 'expo-file-system';

import { useSocial } from './social-store';
import type { Recipe } from './types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const socialConfigured = !!(url && anonKey);

export const supabase = socialConfigured
  ? createClient(url!, anonKey!, { auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;

export type PublicProfile = { id: string; handle: string; name: string; bio: string; streak: number; photo?: string | null; verified?: boolean };

function db() {
  if (!supabase) throw new Error('Friends needs Supabase. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.');
  return supabase;
}

/** Signs in anonymously the first time, so a profile can be created without a password. */
export async function ensureSession() {
  const client = db();
  const { data } = await client.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: anon, error } = await client.auth.signInAnonymously();
  if (error || !anon.user) throw new Error(error?.message ?? 'Could not sign in.');
  return anon.user.id;
}

export const HANDLE_RULE = /^[A-Za-z0-9_.]{3,20}$/;

/** A reason the username can't be used, or '' if it's free. Usernames ignore capitals, so "Aviv" and "aviv" clash. */
export async function handleProblem(handle: string, userId?: string | null) {
  if (!HANDLE_RULE.test(handle)) return 'Use 3 to 20 letters, numbers, dots or underscores.';
  if (handle.toLowerCase() === 'biteboard') return ''; // reserved; the server only lets the verified official account take it
  if (!supabase) return '';
  const { data } = await supabase.from('profiles').select('id').ilike('handle', handle.replace(/[%_\\]/g, (c) => `\\${c}`)).limit(1);
  return data?.length && data[0].id !== userId ? `@${handle} is taken. Try another one.` : '';
}

export async function myProfile(userId: string) {
  const { data } = await db().from('profiles').select('*').eq('id', userId).maybeSingle();
  return (data as PublicProfile | null) ?? null;
}

export async function saveProfile(userId: string, p: { handle: string; name: string; bio: string; streak: number; photo?: string | null }) {
  const isNew = !(await myProfile(userId));
  const { error } = await db().from('profiles').upsert({ id: userId, ...p, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.code === '23505' ? `@${p.handle} is taken. Try another one.` : error.message);
  // New accounts follow @biteboard to start, like TikTok does with its own account. They can unfollow any time.
  if (isNew) {
    const o = await officialAccount().catch(() => null);
    if (o && o.id !== userId) await setFriend(userId, o.id, true).catch(() => {});
  }
}

/** The official @biteboard account, once it exists. Only a verified profile can hold the name (migration 0008). */
export async function officialAccount() {
  const { data } = await db().from('profiles').select('*').eq('verified', true).ilike('handle', 'biteboard').maybeSingle();
  return (data as PublicProfile | null) ?? null;
}

export async function searchPeople(q: string, userId: string) {
  const term = q.replace(/^@/, '').replace(/[%,]/g, '').trim();
  let query = db().from('profiles').select('*').neq('id', userId).limit(20);
  if (term) query = query.or(`handle.ilike.%${term}%,name.ilike.%${term}%`);
  const [{ data }, o] = await Promise.all([query, officialAccount().catch(() => null)]);
  const list = (data as PublicProfile[]) ?? [];
  // @biteboard always comes first: in suggestions, and in results when it matches.
  const fits = o && o.id !== userId && (!term || `${o.handle} ${o.name}`.toLowerCase().includes(term.toLowerCase()));
  const blocked = new Set(useSocial.getState().blocked);
  const ok = list.filter((x) => !blocked.has(x.id));
  return fits ? [o, ...ok.filter((x) => x.id !== o.id)] : ok;
}

export async function friendIds(userId: string) {
  const { data } = await db().from('friendships').select('friend_id').eq('user_id', userId);
  return (data ?? []).map((r) => r.friend_id as string);
}

export async function followerIds(userId: string) {
  const { data } = await db().from('friendships').select('user_id').eq('friend_id', userId);
  return (data ?? []).map((r) => r.user_id as string);
}

export async function setFriend(userId: string, friendId: string, on: boolean) {
  const t = db().from('friendships');
  const { error } = on
    ? await t.insert({ user_id: userId, friend_id: friendId })
    : await t.delete().eq('user_id', userId).eq('friend_id', friendId);
  if (error) throw new Error(error.message);
}

/** How many people follow this person, and how many they follow. */
export async function followCounts(userId: string) {
  const t = () => db().from('friendships').select('user_id', { count: 'exact', head: true });
  // Likes count every like on this person's posts (post keys start with their id).
  const likes = db().from('post_likes').select('post_id', { count: 'exact', head: true }).like('post_id', `${userId}:%`);
  const [a, b, c] = await Promise.all([t().eq('friend_id', userId), t().eq('user_id', userId), likes]);
  return { followers: a.count ?? 0, following: b.count ?? 0, likes: c.count ?? 0 };
}

export async function profilesByIds(ids: string[]) {
  if (!ids.length) return [];
  const { data } = await db().from('profiles').select('*').in('id', ids);
  return (data as PublicProfile[]) ?? [];
}

type Row = { owner: string; recipe: Recipe; created_at: string; profiles?: { handle: string } | null };
const toPost = (r: Row): Recipe => ({ ...r.recipe, by: r.profiles?.handle, byId: r.owner, posted: Date.parse(r.created_at) });

export async function recipesBy(ownerIds: string[]) {
  if (!ownerIds.length) return [];
  const { data } = await db().from('shared_recipes').select('id, owner, recipe, created_at').in('owner', ownerIds).order('created_at', { ascending: false });
  return (data ?? []).map((r) => ({ owner: r.owner as string, recipe: { ...(r.recipe as Recipe), posted: Date.parse(r.created_at as string) } }));
}

/** Newest posts from everyone except you, for the For you feed. */
export async function forYouPosts(userId: string, limit = 60) {
  const { data, error } = await db().from('shared_recipes').select('id, owner, recipe, created_at, profiles(handle)')
    .neq('owner', userId).order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[]).map(toPost).filter(visible);
}

/** Hides posts from people you blocked, and posts you reported or marked "not interested". */
export const visible = (r: Recipe) => {
  const st = useSocial.getState();
  return !(r.byId && st.blocked.includes(r.byId)) && !st.hidden.includes(`${r.byId}:${r.id}`);
};

const BUCKET = 'recipe-photos';

const TYPES: Record<string, string> = { png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', webm: 'video/webm' };

/** Uploads a photo or video on this phone into the poster's own folder, so everyone can see it but only they can replace it. */
async function uploadPhoto(userId: string, name: string, localUri: string) {
  const ext = (localUri.split('.').pop()?.split('?')[0] || 'jpg').toLowerCase();
  const type = TYPES[ext] ?? 'image/jpeg';
  const body = await new File(localUri).arrayBuffer();
  const path = `${userId}/${name}.${ext}`;
  const { error } = await db().storage.from(BUCKET).upload(path, body, { contentType: type, upsert: true });
  if (error) throw new Error(error.message);
  return `${db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}

/** Uploads a new profile picture and saves it on your profile. Only you can replace it. */
export async function setProfilePhoto(userId: string, localUri: string) {
  const photo = await uploadPhoto(userId, 'avatar', localUri);
  const { error } = await db().from('profiles').update({ photo, updated_at: new Date().toISOString() }).eq('id', userId);
  if (error) throw new Error(error.message);
  return photo;
}

/** Posts a recipe (with its photo and cooking video) to your recipe page and For you, or takes it down. Returns the photo's public URL when posting. */
export async function setShared(userId: string, recipe: Recipe, on: boolean, localPhoto?: string) {
  const t = db().from('shared_recipes');
  if (!on) {
    const { error } = await t.delete().eq('id', recipe.id).eq('owner', userId);
    if (error) throw new Error(error.message);
    const { data } = await db().storage.from(BUCKET).list(userId, { search: recipe.id });
    if (data?.length) await db().storage.from(BUCKET).remove(data.map((f) => `${userId}/${f.name}`));
    return null;
  }
  const image = localPhoto && !localPhoto.startsWith('http') ? await uploadPhoto(userId, recipe.id, localPhoto) : localPhoto ?? recipe.image ?? null;
  const video = recipe.video && !recipe.video.startsWith('http') ? await uploadPhoto(userId, `${recipe.id}-video`, recipe.video) : recipe.video ?? null;
  const cover = recipe.cover && !recipe.cover.startsWith('http') ? await uploadPhoto(userId, `${recipe.id}-cover`, recipe.cover).catch(() => undefined) : recipe.cover;
  const { error } = await t.upsert({ id: recipe.id, owner: userId, recipe: { ...recipe, image, video, cover, shared: undefined, by: undefined, byId: undefined, posted: undefined } });
  if (error) throw new Error(error.message);
  return image;
}

/** Deletes your profile, posts, follows, uploaded photos and videos, and the sign-in itself. */
export async function deleteAccount(userId: string) {
  const client = db();
  const { data: files } = await client.storage.from(BUCKET).list(userId, { limit: 1000 });
  if (files?.length) await client.storage.from(BUCKET).remove(files.map((f) => `${userId}/${f.name}`));
  // Deleting the profile also removes its posts and follows (on delete cascade).
  const { error } = await client.from('profiles').delete().eq('id', userId);
  if (error) throw new Error(error.message);
  const { error: rpcError } = await client.rpc('delete_my_account');
  if (rpcError) throw new Error(rpcError.message);
  await client.auth.signOut();
}

// ---------- likes, comments and messages ----------

/** A post is named "{owner id}:{recipe id}", the same way the website names it. */
export const postKey = (r: Pick<Recipe, 'id' | 'byId'>, userId: string | null) => `${r.byId ?? userId ?? 'me'}:${r.id}`;

/** Like counts for these posts, and which of them you liked. */
export async function likesFor(keys: string[], userId: string) {
  if (!keys.length) return { counts: {} as Record<string, number>, mine: new Set<string>() };
  const { data } = await db().from('post_likes').select('post_id, user_id').in('post_id', keys);
  const counts: Record<string, number> = {};
  const mine = new Set<string>();
  for (const l of data ?? []) {
    counts[l.post_id] = (counts[l.post_id] ?? 0) + 1;
    if (l.user_id === userId) mine.add(l.post_id);
  }
  return { counts, mine };
}

export async function setLike(key: string, userId: string, on: boolean) {
  const t = db().from('post_likes');
  const { error } = on ? await t.insert({ post_id: key, user_id: userId }) : await t.delete().eq('post_id', key).eq('user_id', userId);
  if (error && error.code !== '23505') throw new Error(error.message);
}

export type Comment = { id: string; post_id: string; user_id: string; body: string; created_at: string; parent_id?: string | null; author?: PublicProfile };

export async function commentCounts(keys: string[]) {
  if (!keys.length) return {} as Record<string, number>;
  const { data } = await db().from('post_comments').select('post_id').in('post_id', keys);
  const counts: Record<string, number> = {};
  for (const c of data ?? []) counts[c.post_id] = (counts[c.post_id] ?? 0) + 1;
  return counts;
}

export async function commentsOn(key: string) {
  const { data, error } = await db().from('post_comments').select('id, post_id, user_id, body, created_at, parent_id').eq('post_id', key).order('created_at').limit(300);
  if (error) throw new Error(error.message);
  const blocked = new Set(useSocial.getState().blocked);
  const list = ((data ?? []) as Comment[]).filter((c) => !blocked.has(c.user_id) && !useSocial.getState().hidden.includes(`c:${c.id}`));
  const people = Object.fromEntries((await profilesByIds([...new Set(list.map((c) => c.user_id))])).map((p) => [p.id, p]));
  return list.map((c) => ({ ...c, author: people[c.user_id] }));
}

export async function addComment(key: string, userId: string, body: string, parentId?: string) {
  const { error } = await db().from('post_comments').insert({ post_id: key, user_id: userId, body: body.slice(0, 300), parent_id: parentId ?? null });
  if (error) throw new Error(error.message);
}

export async function deleteComment(id: string) {
  const { error } = await db().from('post_comments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** What travels with a shared video, so the chat can show and play it. */
export type SharedPost = Pick<Recipe, 'id' | 'byId' | 'by' | 'title' | 'caption' | 'video' | 'speed' | 'trim' | 'cuts' | 'filter' | 'mirror' | 'music' | 'mvol' | 'ovol' | 'texts' | 'cover'>;
export type Message = { id: string; sender: string; recipient: string; body: string; post: SharedPost | null; created_at: string; read_at: string | null };

export const sharedPost = (r: Recipe): SharedPost => ({ id: r.id, byId: r.byId, by: r.by, title: r.title, caption: r.caption, video: r.video, speed: r.speed, trim: r.trim, cuts: r.cuts, filter: r.filter, mirror: r.mirror, music: r.music, mvol: r.mvol, ovol: r.ovol, texts: r.texts, cover: r.cover });

export async function sendMessage(userId: string, to: string, body: string, post?: SharedPost) {
  const { error } = await db().from('messages').insert({ sender: userId, recipient: to, body: body.slice(0, 1000), post: post ?? null });
  if (error) throw new Error(error.message);
}

/** Your latest message with each person, newest first, with how many of theirs you haven't read. */
export async function conversations(userId: string) {
  const { data, error } = await db().from('messages').select('*').or(`sender.eq.${userId},recipient.eq.${userId}`).order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  const byPerson = new Map<string, { other: string; last: Message; unread: number }>();
  for (const m of (data ?? []) as Message[]) {
    const other = m.sender === userId ? m.recipient : m.sender;
    const c = byPerson.get(other) ?? { other, last: m, unread: 0 };
    if (m.recipient === userId && !m.read_at) c.unread += 1;
    byPerson.set(other, c);
  }
  const blocked = new Set(useSocial.getState().blocked);
  return [...byPerson.values()].filter((c) => !blocked.has(c.other));
}

export async function chatWith(userId: string, other: string) {
  const { data, error } = await db().from('messages').select('*')
    .or(`and(sender.eq.${userId},recipient.eq.${other}),and(sender.eq.${other},recipient.eq.${userId})`).order('created_at').limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as Message[];
}

export async function markRead(other: string) {
  await db().rpc('mark_read', { other });
}

/** Calls back whenever a message to or from you arrives. Returns a function that stops listening. */
export function onMessages(userId: string, cb: () => void) {
  const ch = db().channel(`messages-${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient=eq.${userId}` }, cb)
    .subscribe();
  return () => { db().removeChannel(ch); };
}

// ---------- search ----------

/** Posts from everyone whose title or caption mentions the words (a #hashtag is just text in the caption). */
export async function searchPosts(q: string, limit = 60) {
  const term = q.replace(/[%,()]/g, '').trim();
  if (!term) return [];
  const { data, error } = await db().from('shared_recipes').select('id, owner, recipe, created_at, profiles(handle)')
    .or(`recipe->>title.ilike.%${term}%,recipe->>caption.ilike.%${term}%`).order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[]).map(toPost);
}

// ---------- safety: report and block ----------

export const REPORT_REASONS = ['Spam or scam', 'Nudity or sexual content', 'Bullying or harassment', 'Hate speech or symbols', 'Dangerous weight-loss or eating disorder content', 'Violence or threats', 'Pretending to be someone', 'Something else'];

/** Sends a report to Biteboard. Reports are anonymous to the person reported, and only Biteboard can read them. */
export async function report(userId: string, kind: 'post' | 'comment' | 'user' | 'message', target: string, reason: string, targetUser?: string) {
  const { error } = await db().from('reports').insert({ reporter: userId, kind, target, reason, target_user: targetUser ?? null });
  if (error) throw new Error(error.message);
}

export async function blockedIds(userId: string) {
  const { data } = await db().from('blocks').select('blocked').eq('blocker', userId);
  return (data ?? []).map((r) => r.blocked as string);
}

/** Blocking also unfollows both ways (the server does that), and hides their posts, comments and messages from you. */
export async function setBlocked(userId: string, other: string, on: boolean) {
  const t = db().from('blocks');
  const { error } = on ? await t.insert({ blocker: userId, blocked: other }) : await t.delete().eq('blocker', userId).eq('blocked', other);
  if (error && error.code !== '23505') throw new Error(error.message);
  const st = useSocial.getState();
  st.set({ blocked: on ? [...new Set([...st.blocked, other])] : st.blocked.filter((x) => x !== other) });
}

/** Stop showing a post or comment ("post:{key}" style ids) on this phone: after a report, or "Not interested". */
export async function hide(id: string) {
  const st = useSocial.getState();
  const hidden = [...new Set([...st.hidden, id])].slice(-500);
  st.set({ hidden });
  await AsyncStorage.setItem('biteboard:hidden', JSON.stringify(hidden)).catch(() => {});
}
export async function loadHidden() {
  const raw = await AsyncStorage.getItem('biteboard:hidden').catch(() => null);
  try { useSocial.getState().set({ hidden: raw ? JSON.parse(raw) : [] }); } catch { /* keep what we have */ }
}

// ---------- activity ----------

export type ActivityItem = { type: 'like' | 'comment' | 'reply' | 'follow' | 'message'; by: string; at: string; post?: string; text?: string };

/** Everything that happened to you lately: likes and comments on your posts, replies to your comments, new followers and messages. */
export async function activity(userId: string): Promise<{ items: ActivityItem[]; people: Record<string, PublicProfile> }> {
  const mine = `${userId}:%`;
  const [likes, comments, myComments, follows, msgs] = await Promise.all([
    db().from('post_likes').select('post_id, user_id, created_at').like('post_id', mine).neq('user_id', userId).order('created_at', { ascending: false }).limit(60),
    db().from('post_comments').select('id, post_id, user_id, body, created_at, parent_id').like('post_id', mine).neq('user_id', userId).order('created_at', { ascending: false }).limit(60),
    db().from('post_comments').select('id').eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
    db().from('friendships').select('user_id, created_at').eq('friend_id', userId).order('created_at', { ascending: false }).limit(60),
    db().from('messages').select('sender, body, created_at').eq('recipient', userId).order('created_at', { ascending: false }).limit(60),
  ]);
  const myIds = (myComments.data ?? []).map((c) => c.id as string);
  const replies = myIds.length
    ? (await db().from('post_comments').select('post_id, user_id, body, created_at').in('parent_id', myIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(60)).data ?? []
    : [];
  const items: ActivityItem[] = [
    ...(likes.data ?? []).map((l) => ({ type: 'like' as const, by: l.user_id, at: l.created_at, post: l.post_id })),
    ...(comments.data ?? []).filter((c) => !c.parent_id || !myIds.includes(c.parent_id)).map((c) => ({ type: 'comment' as const, by: c.user_id, at: c.created_at, post: c.post_id, text: c.body })),
    ...replies.map((c) => ({ type: 'reply' as const, by: c.user_id, at: c.created_at, post: c.post_id, text: c.body })),
    ...(follows.data ?? []).map((f) => ({ type: 'follow' as const, by: f.user_id, at: f.created_at })),
  ];
  // One line per person for messages: their latest.
  const seen = new Set<string>();
  for (const m of msgs.data ?? []) if (!seen.has(m.sender)) { seen.add(m.sender); items.push({ type: 'message', by: m.sender, at: m.created_at, text: m.body || 'Sent you a video' }); }
  const blocked = new Set(useSocial.getState().blocked);
  const list = items.filter((x) => !blocked.has(x.by)).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 150);
  const people = Object.fromEntries((await profilesByIds([...new Set(list.map((x) => x.by))])).map((p) => [p.id, p]));
  return { items: list, people };
}

export const ACTIVITY_READ = 'biteboard:activity-read';

/** How many things happened since you last opened Activity, for the bell on Account. */
export async function activityNewCount(userId: string) {
  const read = Number(await AsyncStorage.getItem(ACTIVITY_READ).catch(() => 0)) || 0;
  const { items } = await activity(userId);
  return items.filter((x) => Date.parse(x.at) > read).length;
}

// ---------- push notifications ----------

export async function savePushToken(userId: string, token: string, enabled: boolean) {
  const { error } = await db().from('push_tokens').upsert({ token, user_id: userId, enabled, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
