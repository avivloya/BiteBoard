import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { RecipeVideo } from '@/components/recipe-video';
import { Row } from '@/components/screen';
import { Avatar } from '@/components/social';
import { Button, T } from '@/components/ui';
import { Radius } from '@/constants/theme';
import { useSocial } from '@/lib/social-store';
import type { Recipe } from '@/lib/types';

/** Full-height cooking videos you swipe through one at a time. Only the one on screen plays. */
export function Reels({ posts }: { posts: Recipe[] }) {
  const people = useSocial((s) => s.people);
  const [height, setHeight] = useState(0);
  const [current, setCurrent] = useState(posts[0]?.id);
  const [muted, setMuted] = useState(true);
  const onViewable = useRef(({ viewableItems }: { viewableItems: { item: Recipe }[] }) => {
    if (viewableItems[0]) setCurrent(viewableItems[0].item.id);
  }).current;
  const item = useCallback(({ item: r }: { item: Recipe }) => (
    <View style={{ height, paddingBottom: 12 }}>
      <View style={{ flex: 1, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: '#000' }}>
        <RecipeVideo uri={r.video!} autoPlay active={r.id === current} muted={muted} controls={false} speed={r.speed} trim={r.trim} cuts={r.cuts} filter={r.filter} style={{ flex: 1 }} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 6, backgroundColor: 'rgba(0,0,0,0.35)' }}>
          {r.byId && (
            <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id: r.byId! } })} accessibilityRole="link">
              <Row>
                {people[r.byId] && <Avatar p={people[r.byId]} size={22} />}
                <T style={{ color: '#fff', fontWeight: '700' }}>@{r.by}</T>
              </Row>
            </Pressable>
          )}
          <T variant="h3" style={{ color: '#fff' }}>{r.title}</T>
          {!!r.caption && <T style={{ color: '#fff' }} numberOfLines={2}>{r.caption}</T>}
          <T style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{Math.round(r.kcal)} kcal · {r.min} min · {Math.round(r.p)}g protein</T>
          <Row>
            <Button title="View recipe" kind="primary" onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} />
            <Button title={muted ? 'Sound on' : 'Sound off'} onPress={() => setMuted(!muted)} />
          </Row>
        </View>
      </View>
    </View>
  ), [height, current, muted, people]);

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 && (
        <FlatList data={posts} keyExtractor={(r) => r.id} renderItem={item} pagingEnabled showsVerticalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
          onViewableItemsChanged={onViewable} viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          windowSize={3} initialNumToRender={1} maxToRenderPerBatch={2} />
      )}
    </View>
  );
}
