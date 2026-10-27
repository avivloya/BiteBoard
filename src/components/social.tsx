import { View } from 'react-native';

import { T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { friendIds, myProfile, profilesByIds, recipesBy } from '@/lib/social';
import { useSocial } from '@/lib/social-store';

export function Avatar({ p, size = 44 }: { p: { name?: string; handle?: string }; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' }}>
      <T style={{ color: Colors.accentInk, fontWeight: '800', fontSize: size * 0.42 }}>{(p.name || p.handle || '?').trim().charAt(0).toUpperCase()}</T>
    </View>
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

