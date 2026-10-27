import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { RecipeArt } from '@/components/plate';
import { Row, Screen } from '@/components/screen';
import { Button, Chip, Field, Panel, Segmented, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { guessMeal } from '@/lib/dates';
import { setShared, socialConfigured } from '@/lib/social';
import { useSocial } from '@/lib/social-store';
import { findRecipe, useStore } from '@/lib/store';
import { MEALS, type Meal } from '@/lib/types';
import { pickRecipePhoto } from '@/lib/photos';

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const feed = useSocial((s) => s.feed);
  const forYou = useSocial((s) => s.forYou);
  const { userId, me } = useSocial();
  const mine = useStore((s) => s.mine);
  const boards = useStore((s) => s.boards);
  const { addEntry, toggleSave, createBoard, updateRecipe, deleteRecipe, setPhoto } = useStore();
  const hasPhoto = useStore((s) => !!s.photos[id]);
  const recipe = mine.find((r) => r.id === id) ?? findRecipe(id, [...feed, ...forYou]);
  const [qty, setQty] = useState(1);
  const [meal, setMeal] = useState<Meal>(recipe?.cat === 'Snack' ? 'Snack' : guessMeal());
  const [newBoard, setNewBoard] = useState('');
  if (!recipe) return null;
  const own = (recipe.ai || recipe.own) && !recipe.by;

  const share = async () => {
    if (!userId) return Alert.alert('Create your recipe page first', 'Open the Friends tab to pick a handle.');
    try {
      await setShared(userId, recipe, !recipe.shared, useStore.getState().photos[recipe.id]);
      updateRecipe(recipe.id, { shared: !recipe.shared, posted: recipe.shared ? undefined : Date.now() });
    } catch (e) {
      Alert.alert('Could not update your profile', e instanceof Error ? e.message : '');
    }
  };

  // Only the person who made a recipe can change its photo; a posted recipe is re-posted with the new one.
  const changePhoto = async (add: boolean) => {
    const uri = add ? await pickRecipePhoto() : null;
    if (add && !uri) return;
    setPhoto(recipe.id, uri);
    if (recipe.shared && userId) {
      await setShared(userId, { ...recipe, image: null }, true, uri ?? undefined).catch((e) => Alert.alert('Could not update your post', e instanceof Error ? e.message : ''));
    }
  };

  return (
    <Screen edges={[]} bg={Colors.surface} style={{ padding: 0, gap: 0 }}>
      <View>
        <RecipeArt recipe={recipe} style={{ height: 300 }} />
        {own && (
          <Row style={{ position: 'absolute', left: 16, bottom: 16 }}>
            <Button title={hasPhoto ? 'Change photo' : 'Add a photo'} onPress={() => changePhoto(true)} />
            {hasPhoto && <Button title="Remove" onPress={() => changePhoto(false)} />}
          </Row>
        )}
      </View>
      <View style={{ padding: 20, gap: 18 }}>
        <View style={{ gap: 4 }}>
          <T variant="muted">{recipe.cat} · {recipe.min} min · {recipe.serv} serving{recipe.serv > 1 ? 's' : ''}{recipe.ai ? ' · Created with AI' : ''}</T>
          {recipe.by && recipe.byId && (
            <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id: recipe.byId! } })} accessibilityRole="link">
              <T style={{ fontWeight: '700' }}>@{recipe.by}</T>
            </Pressable>
          )}
          <T variant="title" style={{ fontSize: 30 }}>{recipe.title}</T>
        </View>

        <Row style={{ flexWrap: 'nowrap' }}>
          {[['kcal', recipe.kcal, ''], ['protein', recipe.p, 'g'], ['carbs', recipe.c, 'g'], ['fat', recipe.f, 'g']].map(([l, v, u]) => (
            <View key={l as string} style={{ flex: 1, backgroundColor: Colors.surface2, borderRadius: 14, padding: 10 }}>
              <T variant="num" style={{ fontSize: 18 }}>{Math.round(v as number)}{u}</T>
              <T variant="muted" style={{ fontSize: 12 }}>{l}</T>
            </View>
          ))}
        </Row>

        <Panel style={{ backgroundColor: Colors.bg }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T style={{ fontWeight: '600' }}>Servings eaten</T>
            <Row>
              <Button title="−" onPress={() => setQty(Math.max(0.25, qty - 0.25))} />
              <T variant="num" style={{ fontSize: 16, minWidth: 40, textAlign: 'center' }}>{qty}</T>
              <Button title="+" onPress={() => setQty(qty + 0.25)} />
            </Row>
          </Row>
          <Segmented value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m, label: m }))} />
          <Button title={`Log ${Math.round(recipe.kcal * qty)} kcal`} kind="primary" onPress={() => {
            addEntry({ name: recipe.title, kcal: recipe.kcal * qty, p: recipe.p * qty, c: recipe.c * qty, f: recipe.f * qty, meal, src: 'recipe' });
            router.back();
          }} />
        </Panel>

        <View style={{ gap: 8 }}>
          <T variant="label">Save to a board</T>
          <Row>
            {boards.map((b) => <Chip key={b.id} label={b.ids.includes(recipe.id) ? `✓ ${b.name}` : b.name} selected={b.ids.includes(recipe.id)} onPress={() => toggleSave(b.id, recipe.id)} />)}
          </Row>
          <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}><Field label="New board" value={newBoard} onChangeText={setNewBoard} placeholder="Dinner ideas" /></View>
            <Button title="Create & save" disabled={!newBoard.trim()} onPress={() => { createBoard(newBoard.trim(), recipe.id); setNewBoard(''); }} />
          </Row>
        </View>

        <View style={{ gap: 8 }}>
          <T variant="label">Ingredients</T>
          {recipe.ing.map((x, i) => <T key={i} style={{ borderBottomWidth: 1, borderBottomColor: Colors.line, paddingBottom: 6 }}>{x}</T>)}
        </View>
        <View style={{ gap: 8 }}>
          <T variant="label">Method</T>
          {recipe.steps.map((x, i) => <T key={i}>{i + 1}. {x}</T>)}
        </View>

        {own && (
          <Row>
            {socialConfigured && me && <Button title={recipe.shared ? 'Posted ✓' : 'Post to For you'} onPress={share} />}
            <Button title="Delete recipe" kind="ghost" onPress={() => Alert.alert('Delete this recipe?', undefined, [
              { text: 'Keep it', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: async () => {
                if (recipe.shared && userId) await setShared(userId, recipe, false).catch(() => {});
                deleteRecipe(recipe.id); router.back();
              } },
            ])} />
          </Row>
        )}
        <View style={{ height: 8, borderRadius: Radius.sm }} />
      </View>
    </Screen>
  );
}
