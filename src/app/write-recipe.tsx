import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Switch, TextInput, View } from 'react-native';

import { RecipeVideo } from '@/components/recipe-video';
import { Row, Screen } from '@/components/screen';
import { Button, Field, Segmented, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { tr } from '@/lib/i18n';
import { deleteRecipePhoto, pickRecipePhoto, pickRecipeVideo } from '@/lib/photos';
import { cutsFromParam, type Filmed, filmVideo, textsFromParam } from '@/lib/recorder';
import { setShared } from '@/lib/social';
import { useSocial } from '@/lib/social-store';
import { useStore } from '@/lib/store';
import { MEALS, type Meal } from '@/lib/types';

/** The post screen after filming: caption next to the video, then the recipe details. */
export default function WriteRecipe() {
  const params = useLocalSearchParams<{ video?: string; speed?: string; start?: string; end?: string; filter?: Filmed['filter']; cuts?: string; music?: string; mvol?: string; ovol?: string; texts?: string; cover?: string }>();
  const { addRecipe, setPhoto } = useStore();
  const [photo, setPhotoUri] = useState<string | null>(null);
  const [video, setVideo] = useState<Filmed | null>(params.video ? { uri: params.video, speed: Number(params.speed) || 1, trim: params.end ? [Number(params.start) || 0, Number(params.end)] : undefined, filter: params.filter, cuts: cutsFromParam(params.cuts),
    music: params.music || undefined, mvol: params.mvol ? Number(params.mvol) : undefined, ovol: params.ovol ? Number(params.ovol) : undefined, texts: textsFromParam(params.texts), cover: params.cover || undefined } : null);
  const { userId, me } = useSocial();
  const canPost = !!(userId && me);
  const [post, setPost] = useState(true);
  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState<Meal>('Dinner');
  const [n, setN] = useState({ min: params.video ? '' : '20', serv: '2', kcal: '', p: '', c: '', f: '' });
  const [ing, setIng] = useState('');
  const [steps, setSteps] = useState('');
  const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
  // A video post only needs the video; the recipe is optional. A recipe without a video needs the basics.
  const valid = video ? true : title.trim() && Number(n.kcal) > 0 && lines(ing).length && lines(steps).length;
  const [more, setMore] = useState(false);

  const save = () => {
    const kcal = Number(n.kcal) || 0, p = Number(n.p) || 0;
    const name = title.trim() || caption.trim().split('\n')[0].slice(0, 40) || 'Cooking video';
    const tags = [kcal > 0 && kcal < 400 && 'Under 400', p >= 25 && 'High protein'].filter((x): x is string => !!x);
    const shared = canPost && post;
    const id = addRecipe({
      own: true, shared, posted: shared ? Date.now() : undefined, title: name, caption: caption.trim() || undefined, cat,
      min: Number(n.min) || (video ? 0 : 20), serv: Number(n.serv) || 1, kcal, p, c: Number(n.c) || 0, f: Number(n.f) || 0, tags, ing: lines(ing), steps: lines(steps),
      video: video?.uri, speed: video?.speed, trim: video?.trim, cuts: video?.cuts, filter: video?.filter,
      music: video?.music, mvol: video?.mvol, ovol: video?.ovol, texts: video?.texts, cover: video?.cover,
    });
    if (photo) setPhoto(id, photo);
    if (shared && userId) {
      const recipe = useStore.getState().mine.find((r) => r.id === id)!;
      setShared(userId, recipe, true, photo ?? undefined).catch((e) => {
        useStore.getState().updateRecipe(id, { shared: false, posted: undefined });
        Alert.alert('Saved, but not posted', e instanceof Error ? e.message : 'Try posting it again from the recipe page.');
      });
    }
    router.replace({ pathname: '/recipe/[id]', params: { id } });
  };

  const num = (k: keyof typeof n, label: string) => (
    <View style={{ flex: 1 }}><Field label={label} value={n[k]} onChangeText={(v) => setN({ ...n, [k]: v })} keyboardType="number-pad" /></View>
  );
  const choosePhoto = async () => { const uri = await pickRecipePhoto(); if (uri) setPhotoUri(uri); };

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">New post</T>

      <Row style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 12 }}>
        <View style={{ flex: 1, minHeight: 190, backgroundColor: Colors.bg, borderRadius: Radius.md, padding: 12 }}>
          <TextInput value={caption} onChangeText={setCaption} placeholder={tr("Write a caption…")} placeholderTextColor={Colors.muted} multiline maxLength={300}
            style={{ flex: 1, fontSize: 16, color: Colors.ink, textAlignVertical: 'top' }} />
        </View>
        {video ? (
          <View style={{ width: 112, height: 190, borderRadius: Radius.md, overflow: 'hidden' }}>
            <RecipeVideo uri={video.uri} speed={video.speed} trim={video.trim} cuts={video.cuts} filter={video.filter} texts={video.texts} autoPlay muted controls={false} style={{ flex: 1 }} />
            <Pressable onPress={() => { deleteRecipePhoto(video.uri); setVideo(null); }} style={{ position: 'absolute', bottom: 6, left: 6, right: 6, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center' }}>
              <T style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Remove</T>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={choosePhoto} accessibilityLabel={photo ? 'Change photo' : 'Add a photo'}
            style={{ width: 112, height: 190, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
            {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <T variant="muted" style={{ textAlign: 'center' }}>+ Cover photo</T>}
          </Pressable>
        )}
      </Row>
      {!video && (
        <Row>
          <Button title="Film a video" kind="primary" onPress={async () => { const v = await filmVideo(); if (v) setVideo(v); }} />
          <Button title="Upload one" onPress={async () => { const uri = await pickRecipeVideo(); if (uri) setVideo({ uri, speed: 1 }); }} />
        </Row>
      )}
      {video && !more && <Button title="+ Add the recipe (optional)" kind="ghost" onPress={() => setMore(true)} />}

      {(!video || more) && <>
      <T variant="label">Recipe</T>
      <Field label="Recipe name" value={title} onChangeText={setTitle} placeholder={tr("Mom's lentil salad")} />
      <Segmented value={cat} onChange={setCat} options={MEALS.map((m) => ({ value: m, label: m }))} />
      <Row style={{ flexWrap: 'nowrap' }}>{num('min', 'Minutes')}{num('serv', 'Servings')}{num('kcal', 'kcal / serving')}</Row>
      <Row style={{ flexWrap: 'nowrap' }}>{num('p', 'Protein g')}{num('c', 'Carbs g')}{num('f', 'Fat g')}</Row>
      <Field label="Ingredients, one per line" value={ing} onChangeText={setIng} multiline />
      <Field label="Steps, one per line" value={steps} onChangeText={setSteps} multiline />
      </>}
      {canPost && (
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <T style={{ flex: 1 }}>Post to Explore and my account</T>
          <Switch value={post} onValueChange={setPost} trackColor={{ true: Colors.accent, false: Colors.line }} />
        </Row>
      )}
      <Button title={canPost && post ? 'Post' : 'Save'} kind="primary" disabled={!valid} onPress={save} />
    </Screen>
  );
}
