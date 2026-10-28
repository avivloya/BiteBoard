import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Masonry } from '@/components/recipe-card';
import { Row, Screen } from '@/components/screen';
import { Button, Field, T } from '@/components/ui';
import { findRecipe, useStore } from '@/lib/store';

export default function BoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const board = useStore((s) => s.boards.find((b) => b.id === id));
  const rename = useStore((s) => s.renameBoard);
  const remove = useStore((s) => s.deleteBoard);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(board?.name ?? '');
  if (!board) return null;
  const recipes = board.ids.map((r) => findRecipe(r)).filter((r) => !!r);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      {editing ? (
        <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><Field label="Board name" value={name} onChangeText={setName} autoFocus /></View>
          <Button title="Save" kind="primary" onPress={() => { if (name.trim()) rename(board.id, name.trim()); setEditing(false); }} />
        </Row>
      ) : (
        <View style={{ gap: 4 }}>
          <T variant="title">{board.name}</T>
          <T variant="muted">{recipes.length} recipe{recipes.length === 1 ? '' : 's'}</T>
        </View>
      )}
      <Row>
        <Button title="Rename" onPress={() => setEditing(true)} />
        <Button title="Delete board" kind="ghost" onPress={() => Alert.alert('Delete this board?', 'The recipes stay in Explore.', [
          { text: 'Keep it', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => { remove(board.id); router.back(); } },
        ])} />
      </Row>
      {recipes.length ? <Masonry recipes={recipes} /> : <T variant="muted">This board is empty. Open any recipe and tap Save to add it here.</T>}
    </Screen>
  );
}
