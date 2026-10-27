import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';

import { Row, Screen } from '@/components/screen';
import { Button, Field, Segmented, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { pickRecipePhoto } from '@/lib/photos';
import { useStore } from '@/lib/store';
import { MEALS, type Meal } from '@/lib/types';

export default function WriteRecipe() {
  const { addRecipe, setPhoto } = useStore();
  const [photo, setPhotoUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState<Meal>('Dinner');
  const [n, setN] = useState({ min: '20', serv: '2', kcal: '', p: '', c: '', f: '' });
  const [ing, setIng] = useState('');
  const [steps, setSteps] = useState('');
  const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
  const valid = title.trim() && Number(n.kcal) > 0 && lines(ing).length && lines(steps).length;

  const save = () => {
    const kcal = Number(n.kcal), p = Number(n.p) || 0;
    const tags = [kcal < 400 && 'Under 400', p >= 25 && 'High protein'].filter((x): x is string => !!x);
    const id = addRecipe({ own: true, title: title.trim(), cat, min: Number(n.min) || 20, serv: Number(n.serv) || 1, kcal, p, c: Number(n.c) || 0, f: Number(n.f) || 0, tags, ing: lines(ing), steps: lines(steps) });
    if (photo) setPhoto(id, photo);
    router.replace({ pathname: '/recipe/[id]', params: { id } });
  };

  const num = (k: keyof typeof n, label: string) => (
    <View style={{ flex: 1 }}><Field label={label} value={n[k]} onChangeText={(v) => setN({ ...n, [k]: v })} keyboardType="number-pad" /></View>
  );

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Write a recipe</T>
      <Pressable onPress={async () => { const uri = await pickRecipePhoto(); if (uri) setPhotoUri(uri); }} accessibilityLabel={photo ? 'Change photo' : 'Add a photo'}
        style={{ height: photo ? 260 : 120, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
        {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <T variant="muted">+ Add a photo</T>}
      </Pressable>
      <Field label="Recipe name" value={title} onChangeText={setTitle} placeholder="Mom's lentil salad" />
      <Segmented value={cat} onChange={setCat} options={MEALS.map((m) => ({ value: m, label: m }))} />
      <Row style={{ flexWrap: 'nowrap' }}>{num('min', 'Minutes')}{num('serv', 'Servings')}{num('kcal', 'kcal / serving')}</Row>
      <Row style={{ flexWrap: 'nowrap' }}>{num('p', 'Protein g')}{num('c', 'Carbs g')}{num('f', 'Fat g')}</Row>
      <Field label="Ingredients, one per line" value={ing} onChangeText={setIng} multiline />
      <Field label="Steps, one per line" value={steps} onChangeText={setSteps} multiline />
      <Button title="Save recipe" kind="primary" disabled={!valid} onPress={save} />
    </Screen>
  );
}
