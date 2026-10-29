import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { File } from 'expo-file-system';

import type { Recipe } from './types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const socialConfigured = !!(url && anonKey);

export const supabase = socialConfigured
  ? createClient(url!, anonKey!, { auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;

export type PublicProfile = { id: string; handle: string; name: string; bio: string; streak: number; photo?: string | null };

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

export async function myProfile(userId: string) {
  const { data } = await db().from('profiles').select('*').eq('id', userId).maybeSingle();
  return (data as PublicProfile | null) ?? null;
}

export async function saveProfile(userId: string, p: { handle: string; name: string; bio: string; streak: number; photo?: string | null }) {
  const { error } = await db().from('profiles').upsert({ id: userId, ...p, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.code === '23505' ? 'That handle is taken. Try another one.' : error.message);
}

export async function searchPeople(q: string, userId: string) {
  const term = q.replace(/^@/, '').replace(/[%,]/g, '').trim();
  let query = db().from('profiles').select('*').neq('id', userId).limit(20);
  if (term) query = query.or(`handle.ilike.%${term}%,name.ilike.%${term}%`);
  const { data } = await query;
  return (data as PublicProfile[]) ?? [];
}

export async function friendIds(userId: string) {
  const { data } = await db().from('friendships').select('friend_id').eq('user_id', userId);
  return (data ?? []).map((r) => r.friend_id as string);
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
  const [a, b] = await Promise.all([t().eq('friend_id', userId), t().eq('user_id', userId)]);
  return { followers: a.count ?? 0, following: b.count ?? 0 };
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
  return ((data ?? []) as unknown as Row[]).map(toPost);
}

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
  const { error } = await t.upsert({ id: recipe.id, owner: userId, recipe: { ...recipe, image, video, shared: undefined, by: undefined, byId: undefined, posted: undefined } });
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
