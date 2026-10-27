import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Masonry } from '@/components/recipe-card';
import { Row, Screen } from '@/components/screen';
import { Avatar, refreshSocial } from '@/components/social';
import { Button, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { type PublicProfile, profilesByIds, recipesBy, setFriend } from '@/lib/social';
import { useSocial } from '@/lib/social-store';
import type { Recipe } from '@/lib/types';

export default function Person() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, friendIds } = useSocial();
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
  return (
    <Screen edges={[]} bg={Colors.surface}>
      <Row style={{ flexWrap: 'nowrap' }}>
        <Avatar p={p} size={72} />
        <View style={{ flex: 1 }}>
          <T variant="h2">{p.name}</T>
          <T variant="muted">@{p.handle}{p.streak ? ` · ${p.streak} day streak` : ''}</T>
        </View>
      </Row>
      {!!p.bio && <T>{p.bio}</T>}
      {userId && userId !== id && (
        <Button title={friend ? 'Friends ✓' : 'Add friend'} kind={friend ? 'secondary' : 'primary'} onPress={async () => { await setFriend(userId, id, !friend); await refreshSocial(userId); }} />
      )}
      <T variant="label">{recipes.length} posted recipe{recipes.length === 1 ? '' : 's'}</T>
      {recipes.length ? <Masonry recipes={recipes} /> : <T variant="muted">{userId === id ? 'Open a recipe you wrote and tap Post to For you, and it shows up here.' : 'No posts yet.'}</T>}
    </Screen>
  );
}
