import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Masonry } from '@/components/recipe-card';
import { confirmBlock, Option, ReportSheet, Sheet } from '@/components/safety';
import { Row, Screen } from '@/components/screen';
import { Avatar, FollowCounts, refreshSocial, Verified } from '@/components/social';
import { Button, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { type PublicProfile, profilesByIds, recipesBy, report, setBlocked, setFriend } from '@/lib/social';
import { useSocial } from '@/lib/social-store';
import type { Recipe } from '@/lib/types';

export default function Person() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, friendIds, blocked } = useSocial();
  const [menu, setMenu] = useState<'more' | 'report' | null>(null);
  const [p, setP] = useState<PublicProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    Promise.all([profilesByIds([id]), recipesBy([id])])
      .then(([[person], rs]) => {
        if (!person) return;
        const list = rs.map((r) => ({ ...r.recipe, by: person.handle, byId: id }));
        setP(person);
        setRecipes(list);
        // Make this person's recipes openable from the recipe screen.
        const feed = useSocial.getState().feed;
        const extra = list.filter((r) => !feed.some((f) => f.id === r.id));
        if (extra.length) useSocial.getState().set({ feed: [...feed, ...extra] });
      })
      .catch(() => {});
  }, [id]);
  if (!p) return null;

  const friend = friendIds.includes(id);
  const isBlocked = blocked.includes(id);
  const other = !!userId && userId !== id;
  return (
    <Screen edges={[]} bg={Colors.surface}>
      <Row style={{ flexWrap: 'nowrap' }}>
        <Avatar p={p} size={72} />
        <View style={{ flex: 1 }}>
          <Row style={{ gap: 6 }}><T variant="h2">{p.name}</T><Verified on={p.verified} size={20} /></Row>
          <T variant="muted">@{p.handle}{p.streak ? ` · ${p.streak} day streak` : ''}</T>
          <FollowCounts id={id} />
        </View>
        {other && <Pressable onPress={() => setMenu('more')} hitSlop={10} accessibilityRole="button" accessibilityLabel="More"><T style={{ fontSize: 22, color: Colors.ink }}>⋯</T></Pressable>}
      </Row>
      {isBlocked && <T variant="muted">You blocked @{p.handle}. You won't see their posts, comments or messages.</T>}
      {!!p.bio && <T>{p.bio}</T>}
      {other && isBlocked && <Button title="Unblock" onPress={() => setBlocked(userId!, id, false).catch(() => {})} />}
      {other && !isBlocked && (
        <Button title={friend ? 'Following' : 'Follow'} kind={friend ? 'secondary' : 'primary'} onPress={async () => { await setFriend(userId, id, !friend); await refreshSocial(userId); }} />
      )}
      <T variant="label">{recipes.length} posted recipe{recipes.length === 1 ? '' : 's'}</T>
      {menu === 'more' && (
        <Sheet title={`@${p.handle}`} onClose={() => setMenu(null)}>
          <Option label="Report account" onPress={() => setMenu('report')} />
          {isBlocked
            ? <Option label="Unblock" onPress={() => { setBlocked(userId!, id, false).catch(() => {}); setMenu(null); }} />
            : <Option label="Block" danger onPress={() => confirmBlock(id, p.handle, () => { setMenu(null); refreshSocial(userId!).catch(() => {}); })} />}
        </Sheet>
      )}
      {menu === 'report' && <ReportSheet title="Report account" onClose={() => setMenu(null)} onPick={(reason) => { report(userId!, 'user', id, reason, id).catch(() => {}); }} blockId={isBlocked ? undefined : id} blockHandle={p.handle} />}
      {isBlocked ? null : recipes.length ? <Masonry recipes={recipes} /> : <T variant="muted">{userId === id ? 'Open a recipe you wrote and tap Post to For you, and it shows up here.' : 'No posts yet.'}</T>}
    </Screen>
  );
}
