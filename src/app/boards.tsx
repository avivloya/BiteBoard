import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RecipeArt } from '@/components/plate';
import { Row, Screen } from '@/components/screen';
import { Button, Field, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { findRecipe, useStore } from '@/lib/store';
import type { Board } from '@/lib/types';

export function Cover({ board }: { board: Board }) {
  const rs = board.ids.map((id) => findRecipe(id)).filter((r) => !!r).slice(0, 3);
  return (
    <View style={styles.cover}>
      <View style={{ flex: 2 }}>{rs[0] ? <RecipeArt recipe={rs[0]} style={StyleSheet.absoluteFill} /> : null}</View>
      <View style={{ flex: 1, gap: 3 }}>
        {[1, 2].map((i) => <View key={i} style={{ flex: 1, backgroundColor: Colors.tile }}>{rs[i] ? <RecipeArt recipe={rs[i]} style={StyleSheet.absoluteFill} /> : null}</View>)}
      </View>
    </View>
  );
}

export default function Boards() {
  const boards = useStore((s) => s.boards);
  const createBoard = useStore((s) => s.createBoard);
  const [name, setName] = useState('');

  return (
    <Screen edges={[]}>
      <View style={{ gap: 6 }}>
        <T variant="title">Your boards</T>
        <T variant="muted">Pin recipes into collections, like a weekly meal plan or go-to snacks.</T>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 18 }}>
        {boards.map((b) => (
          <Pressable key={b.id} style={{ width: '48%' }} onPress={() => router.push({ pathname: '/board/[id]', params: { id: b.id } })}>
            <Cover board={b} />
            <T variant="h3" style={{ marginTop: 8 }} numberOfLines={1}>{b.name}</T>
            <T variant="muted">{b.ids.length} recipe{b.ids.length === 1 ? '' : 's'}</T>
          </Pressable>
        ))}
      </View>
      <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}><Field label="New board" value={name} onChangeText={setName} placeholder="Sunday meal prep" /></View>
        <Button title="Create" kind="primary" disabled={!name.trim()} onPress={() => { createBoard(name.trim()); setName(''); }} />
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { flexDirection: 'row', gap: 3, aspectRatio: 4 / 3, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.surface2 },
});
