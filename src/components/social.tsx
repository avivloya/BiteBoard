import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { blockedIds, followCounts, friendIds, loadHidden, myProfile, profilesByIds, recipesBy, visible } from '@/lib/social';
import { registerPush } from '@/lib/push';
import { useSocial } from '@/lib/social-store';

// The verified badge. `verified` is set only by Biteboard on the server (migration 0008).
export function Verified({ on, size = 14, color = Colors.accent }: { on?: boolean; size?: number; color?: string }) {
  if (!on) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Verified" accessibilityRole="image">
      <Path fill={color} d="M12 1.5l2.6 2 3.2-.4 1.2 3 3 1.2-.4 3.2 2 2.6-2 2.6.4 3.2-3 1.2-1.2 3-3.2-.4-2.6 2-2.6-2-3.2.4-1.2-3-3-1.2.4-3.2-2-2.6 2-2.6-.4-3.2 3-1.2 1.2-3 3.2.4z" />
      <Path d="m7.5 12.3 3 3 6-6.3" fill="none" stroke={color === Colors.accent ? Colors.accentInk : Colors.accent} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Avatar({ p, size = 44 }: { p: { name?: string; handle?: string; photo?: string | null }; size?: number }) {
  if (p.photo) return <Image source={{ uri: p.photo }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.tile }} contentFit="cover" accessibilityLabel={`${p.name || p.handle} profile picture`} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' }}>
      <T style={{ color: Colors.accentInk, fontWeight: '800', fontSize: size * 0.42 }}>{(p.name || p.handle || '?').trim().charAt(0).toUpperCase()}</T>
    </View>
  );
}

/** "12 followers · 3 following", refetched when your own follow list changes. */
export function FollowCounts({ id }: { id: string }) {
  const mine = useSocial((s) => s.friendIds);
  const [c, setC] = useState<{ followers: number; following: number; likes: number } | null>(null);
  useEffect(() => { followCounts(id).then(setC).catch(() => {}); }, [id, mine]);
  if (!c) return null;
  // Profile numbers, TikTok style: Following, Followers, Likes.
  // Tap Following or Followers to see who it is.
  const stat = (n: number, label: string, tab?: 'following' | 'followers') => (
    <Pressable disabled={!tab} onPress={() => tab && router.push({ pathname: '/follows', params: { id, tab } })} accessibilityRole={tab ? 'button' : undefined}
      style={({ pressed }) => ({ alignItems: 'center', minWidth: 64, paddingVertical: 2, borderRadius: 10, opacity: pressed ? 0.6 : 1 })}>
      <T style={{ fontSize: 19, fontWeight: '800', color: Colors.ink }}>{short(n)}</T>
      <T variant="muted" style={{ fontSize: 12.5 }}>{label}</T>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', gap: 14, marginVertical: 4 }}>
      {stat(c.following, 'Following', 'following')}
      {stat(c.followers, c.followers === 1 ? 'Follower' : 'Followers', 'followers')}
      {stat(c.likes, c.likes === 1 ? 'Like' : 'Likes')}
    </View>
  );
}

/** 12,400 → 12K, 1,250,000 → 1.3M. */
const short = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(n < 1e7 ? 1 : 0).replace(/\.0$/, '')}M` : n >= 1e4 ? `${Math.floor(n / 1e3)}K` : n.toLocaleString('en-US'));

export async function refreshSocial(userId: string) {
  const [me, ids, blocked] = await Promise.all([myProfile(userId), friendIds(userId), blockedIds(userId).catch(() => useSocial.getState().blocked)]);
  useSocial.getState().set({ blocked });
  await loadHidden();
  registerPush(userId).catch(() => {});
  const [friends, shared] = await Promise.all([profilesByIds(ids), recipesBy(ids)]);
  const people = Object.fromEntries(friends.map((f) => [f.id, f]));
  useSocial.getState().set({
    userId, me, friendIds: ids, people,
    feed: shared.map(({ owner, recipe }) => ({ ...recipe, by: people[owner]?.handle, byId: owner })).filter(visible),
  });
}

