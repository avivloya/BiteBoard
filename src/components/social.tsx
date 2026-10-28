import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { followCounts, friendIds, myProfile, profilesByIds, recipesBy } from '@/lib/social';
import { useSocial } from '@/lib/social-store';

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
  const [c, setC] = useState<{ followers: number; following: number } | null>(null);
  useEffect(() => { followCounts(id).then(setC).catch(() => {}); }, [id, mine]);
  if (!c) return null;
  return (
    <T variant="muted">
      <T style={{ fontWeight: '700' }}>{c.followers}</T> follower{c.followers === 1 ? '' : 's'} · <T style={{ fontWeight: '700' }}>{c.following}</T> following
    </T>
  );
}

export async function refreshSocial(userId: string) {
  const [me, ids] = await Promise.all([myProfile(userId), friendIds(userId)]);
  const [friends, shared] = await Promise.all([profilesByIds(ids), recipesBy(ids)]);
  const people = Object.fromEntries(friends.map((f) => [f.id, f]));
  useSocial.getState().set({
    userId, me, friendIds: ids, people,
    feed: shared.map(({ owner, recipe }) => ({ ...recipe, by: people[owner]?.handle, byId: owner })),
  });
}

