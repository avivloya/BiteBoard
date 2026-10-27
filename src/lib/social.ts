import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Recipe } from './types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const socialConfigured = !!(url && anonKey);

export const supabase = socialConfigured
  ? createClient(url!, anonKey!, { auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;

export type PublicProfile = { id: string; handle: string; name: string; bio: string; streak: number };

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

export async function saveProfile(userId: string, p: { handle: string; name: string; bio: string; streak: number }) {
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

export async function profilesByIds(ids: string[]) {
  if (!ids.length) return [];
  const { data } = await db().from('profiles').select('*').in('id', ids);
  return (data as PublicProfile[]) ?? [];
}

export async function recipesBy(ownerIds: string[]) {
  if (!ownerIds.length) return [];
  const { data } = await db().from('shared_recipes').select('id, owner, recipe, created_at').in('owner', ownerIds).order('created_at', { ascending: false });
  return (data ?? []).map((r) => ({ owner: r.owner as string, recipe: r.recipe as Recipe }));
}

export async function setShared(userId: string, recipe: Recipe, on: boolean) {
  const t = db().from('shared_recipes');
  const { error } = on
    ? await t.upsert({ id: recipe.id, owner: userId, recipe: { ...recipe, shared: undefined } })
    : await t.delete().eq('id', recipe.id).eq('owner', userId);
  if (error) throw new Error(error.message);
}
