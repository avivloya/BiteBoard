import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, useWindowDimensions, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Button, Panel, Segmented, T } from '@/components/ui';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { type MealEstimate, aiConfigured, estimateMeal } from '@/lib/ai';
import { guessMeal } from '@/lib/dates';
import { usePro } from '@/lib/pro';
import { aiLeft, useStore } from '@/lib/store';
import { MEALS, type Meal } from '@/lib/types';

export default function Snap() {
  const addEntry = useStore((s) => s.addEntry);
  const countAiUse = useStore((s) => s.countAiUse);
  useStore((s) => s.aiUsage); // re-render when the weekly count changes
  const isPro = usePro((s) => s.isPro);
  const left = aiLeft('scans');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MealEstimate | null>(null);
  const [meal, setMeal] = useState<Meal>(guessMeal());
  const { height } = useWindowDimensions();

  const pick = async (camera: boolean) => {
    setError('');
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError(camera ? 'Allow camera access in Settings to snap a meal.' : 'Allow photo access in Settings to choose a meal photo.');
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, base64: true };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets[0]) { setPhoto(res.assets[0]); setResult(null); }
  };

  const analyze = async () => {
    if (!photo?.base64) return;
    if (!isPro && left <= 0) return router.push('/pro');
    setBusy(true); setError('');
    try {
      setResult(await estimateMeal(photo.base64, photo.mimeType ?? 'image/jpeg'));
      if (!isPro) countAiUse('scans');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The estimate did not come back. Try again.');
    }
    setBusy(false);
  };

  const items = result?.items ?? [];
  const sum = items.reduce((a, i) => ({ kcal: a.kcal + i.kcal, p: a.p + i.protein, c: a.c + i.carbs, f: a.f + i.fat }), { kcal: 0, p: 0, c: 0, f: 0 });
  // Changing the grams rescales that food's calories and macros.
  const edit = (i: number, key: 'name' | 'grams', v: string) =>
    setResult((r) => r && {
      ...r,
      items: r.items.map((it, j) => {
        if (j !== i) return it;
        if (key === 'name') return { ...it, name: v };
        const g = Number(v) || 0, f = it.grams > 0 && g > 0 ? g / it.grams : 1;
        return { ...it, grams: g, kcal: it.kcal * f, protein: it.protein * f, carbs: it.carbs * f, fat: it.fat * f };
      }),
    });
  const boxHeight = result ? 140 : Math.min(340, height * 0.42);

  return (
    <Screen edges={[]} bg={Colors.surface} style={{ gap: 12 }}>
      {!result && <T variant="title">Snap a meal</T>}

      <Pressable onPress={() => pick(true)} style={{ borderRadius: Radius.lg, borderWidth: photo ? 0 : 1.5, borderStyle: 'dashed', borderColor: Colors.line, backgroundColor: Colors.surface2, overflow: 'hidden', height: boxHeight, alignItems: 'center', justifyContent: 'center' }}>
        {photo ? <Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel="Your meal photo" /> : (
          <View style={{ alignItems: 'center', gap: 6, padding: 24 }}>
            <T variant="h3">Tap to take a photo</T>
            <T variant="muted">From above works best</T>
          </View>
        )}
      </Pressable>
      {!result && (
        <Row style={{ flexWrap: 'nowrap' }}>
          <Button title={photo ? 'Retake' : 'Camera'} kind={photo ? 'secondary' : 'primary'} onPress={() => pick(true)} style={{ flex: 1, paddingHorizontal: 8 }} />
          <Button title="Library" onPress={() => pick(false)} style={{ flex: 1, paddingHorizontal: 8 }} />
          <Button title="Barcode" onPress={() => router.push('/scan')} style={{ flex: 1, paddingHorizontal: 8 }} />
        </Row>
      )}
      {!isPro && !result && <T variant="muted" style={{ fontSize: 12 }}>{left} free photo scan{left === 1 ? '' : 's'} left this week. Barcodes are always free.</T>}

      {photo && !result && (
        <Button title={busy ? 'Looking at your meal…' : 'Estimate calories'} kind="primary" disabled={busy || !aiConfigured} onPress={analyze}
          icon={busy ? <ActivityIndicator color={Colors.accentInk} /> : undefined} />
      )}
      {!aiConfigured && <T variant="muted" style={{ fontSize: 12 }}>Photo estimates need the AI backend. See the README to set EXPO_PUBLIC_AI_URL.</T>}
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}

      {result && (
        <Panel style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <T variant="h3" style={{ flex: 1 }} numberOfLines={1}>{result.meal_name || 'Your meal'}</T>
            <T variant="label">{result.confidence} confidence</T>
          </Row>
          {items.length ? items.map((it, i) => (
            <Row key={i} style={{ flexWrap: 'nowrap', borderBottomWidth: 1, borderBottomColor: 'rgba(207,181,146,0.6)', paddingBottom: 6 }}>
              <TextInput value={it.name} onChangeText={(v) => edit(i, 'name', v)} style={{ flex: 1, fontSize: 15, fontWeight: '600', color: Colors.ink, paddingVertical: 4 }} />
              <TextInput value={String(Math.round(it.grams))} onChangeText={(v) => edit(i, 'grams', v)} keyboardType="number-pad" accessibilityLabel={`${it.name} grams`}
                style={{ width: 48, textAlign: 'right', fontFamily: Fonts.mono, fontSize: 13, color: Colors.ink, backgroundColor: Colors.surface2, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4 }} />
              <T variant="muted">g</T>
              <T variant="num" style={{ width: 64, textAlign: 'right' }}>{Math.round(it.kcal)} kcal</T>
              <Pressable onPress={() => setResult({ ...result, items: items.filter((_, j) => j !== i) })} accessibilityLabel={`Remove ${it.name}`} hitSlop={10}>
                <T variant="muted">✕</T>
              </Pressable>
            </Row>
          )) : <T>No food found in this photo. Try a clearer shot of the plate.</T>}
          <View>
            <T variant="num" style={{ fontSize: 22 }}>{Math.round(sum.kcal)} kcal</T>
            <T variant="muted">{Math.round(sum.p)}g protein · {Math.round(sum.c)}g carbs · {Math.round(sum.f)}g fat</T>
          </View>
          <Segmented value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m, label: m }))} />
          <Row style={{ flexWrap: 'nowrap' }}>
            <Button title="Start over" kind="ghost" onPress={() => { setPhoto(null); setResult(null); }} />
            <Button title="Add to today" kind="primary" style={{ flex: 1 }} disabled={!items.length} onPress={() => {
              addEntry({ name: result.meal_name || 'Photo meal', ...sum, meal, src: 'photo' });
              setPhoto(null); setResult(null);
              router.back();
            }} />
          </Row>
        </Panel>
      )}
    </Screen>
  );
}
