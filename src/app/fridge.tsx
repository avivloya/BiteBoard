import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row, Screen } from '@/components/screen';
import { Button, Chip, Panel, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { type FridgeReply, aiConfigured, scanFridge } from '@/lib/ai';
import { haptic } from '@/lib/haptics';
import { usePro } from '@/lib/pro';
import { aiLeft, useStore } from '@/lib/store';

/** Snap your fridge or pantry and get three healthy recipes from what is there. */
export default function Fridge() {
  const { addRecipe, countAiUse } = useStore();
  const isPro = usePro((s) => s.isPro);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reply, setReply] = useState<FridgeReply | null>(null);

  const pick = async (camera: boolean) => {
    setError('');
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError('Allow camera or photo access in Settings.');
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, base64: true };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets[0]) return;
    setPhoto(res.assets[0]); setReply(null);
  };

  const go = async () => {
    if (!photo?.base64) return;
    if (!isPro && aiLeft('recipes') <= 0) return router.push('/pro');
    setBusy(true); setError('');
    try {
      setReply(await scanFridge(photo.base64, photo.mimeType ?? 'image/jpeg'));
      if (!isPro) countAiUse('recipes');
      haptic.success();
    } catch (e) { setError(e instanceof Error ? e.message : 'That did not work. Try again.'); }
    setBusy(false);
  };

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Cook from your fridge</T>
      <T variant="muted">Take a photo of your open fridge, pantry or the food on your counter.</T>
      {photo && <Image source={{ uri: photo.uri }} style={{ height: 200, borderRadius: Radius.lg }} contentFit="cover" />}
      <Row style={{ flexWrap: 'nowrap' }}>
        <Button title={photo ? 'Retake' : 'Camera'} kind={photo ? 'secondary' : 'primary'} style={{ flex: 1 }} onPress={() => pick(true)} />
        <Button title="Library" style={{ flex: 1 }} onPress={() => pick(false)} />
      </Row>
      {photo && !reply && (
        <Button title={busy ? 'Looking in your fridge…' : 'Find recipes'} kind="primary" disabled={busy || !aiConfigured} onPress={go}
          icon={busy ? <ActivityIndicator color={Colors.accentInk} /> : undefined} />
      )}
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      {reply && (
        <>
          <T variant="label">What I see</T>
          <Row>{reply.ingredients.map((x) => <Chip key={x} label={x} />)}</Row>
          {reply.recipes.map((r, i) => (
            <Animated.View key={r.title} entering={FadeInDown.delay(i * 100).springify()}>
              <Panel style={{ gap: 6 }}>
                <T variant="h3">{r.title}</T>
                <T variant="muted">{Math.round(r.kcal)} kcal · {Math.round(r.p)} g protein · {r.min} min</T>
                <T variant="muted" numberOfLines={2}>{r.ing.join(', ')}</T>
                <View style={{ alignItems: 'flex-start' }}>
                  <Button title="Save and open" kind="primary" onPress={() => {
                    const id = addRecipe({ ...r, ai: true });
                    router.push({ pathname: '/recipe/[id]', params: { id } });
                  }} />
                </View>
              </Panel>
            </Animated.View>
          ))}
        </>
      )}
    </Screen>
  );
}
