import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row, Screen } from '@/components/screen';
import { Button, Panel, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { type MenuDish, aiConfigured, scanMenu } from '@/lib/ai';
import { leftToday } from '@/lib/coach';
import { guessMeal } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { usePro } from '@/lib/pro';
import { aiLeft, useStore } from '@/lib/store';

const FIT = { great: { label: 'Great pick', color: '#5C8A4A' }, ok: { label: 'Fits with care', color: '#C08A2E' }, heavy: { label: 'Heavy', color: '#B5562C' } } as const;

/** Snap a restaurant menu and see which dishes fit your calories. */
export default function Menu() {
  const { addEntry, countAiUse } = useStore();
  const isPro = usePro((s) => s.isPro);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [dishes, setDishes] = useState<MenuDish[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { left } = leftToday();

  const pick = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError('Allow camera or photo access in Settings.');
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, base64: true };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setPhoto(a); setDishes(null); setError('');
    if (!a.base64) return;
    if (!isPro && aiLeft('scans') <= 0) return router.push('/pro');
    setBusy(true);
    try {
      const r = await scanMenu(a.base64, a.mimeType ?? 'image/jpeg', left.kcal);
      const order = { great: 0, ok: 1, heavy: 2 };
      setDishes([...r.dishes].sort((x, y) => order[x.fit] - order[y.fit]));
      if (!isPro) countAiUse('scans');
      haptic.success();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not read the menu. Try a sharper photo.'); }
    setBusy(false);
  };

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Eating out?</T>
      <T variant="muted">Snap the menu and see what fits your {Math.round(left.kcal)} kcal left.</T>
      {photo && <Image source={{ uri: photo.uri }} style={{ height: 160, borderRadius: Radius.lg }} contentFit="cover" />}
      <Row style={{ flexWrap: 'nowrap' }}>
        <Button title="Snap menu" kind="primary" style={{ flex: 1 }} disabled={busy || !aiConfigured} onPress={() => pick(true)} />
        <Button title="Library" style={{ flex: 1 }} disabled={busy || !aiConfigured} onPress={() => pick(false)} />
      </Row>
      {busy && <Row><ActivityIndicator color={Colors.accent} /><T variant="muted">Reading the menu…</T></Row>}
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      {dishes?.map((d, i) => (
        <Animated.View key={d.name + i} entering={FadeInDown.delay(Math.min(i, 8) * 60)}>
          <Panel style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <T variant="h3" style={{ flex: 1 }}>{d.name}</T>
              <T variant="num">~{Math.round(d.kcal)} kcal</T>
            </Row>
            <Row>
              <View style={{ backgroundColor: FIT[d.fit].color, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 }}>
                <T style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{FIT[d.fit].label}</T>
              </View>
              <T variant="muted">{Math.round(d.protein)} g protein</T>
            </Row>
            <T variant="muted">{d.tip}</T>
            <View style={{ alignItems: 'flex-start' }}>
              <Button title="I'm having this" kind="ghost" onPress={() => {
                addEntry({ name: d.name, kcal: d.kcal, p: d.protein, c: 0, f: 0, meal: guessMeal(), src: 'manual' });
                router.back();
              }} />
            </View>
          </Panel>
        </Animated.View>
      ))}
      {dishes && !dishes.length && <T variant="muted">No dishes found. Try a closer, sharper photo of the menu.</T>}
    </Screen>
  );
}
