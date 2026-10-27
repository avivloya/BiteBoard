import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Button, Panel, Segmented, T } from '@/components/ui';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { type MealEstimate, type MealItem, aiConfigured, estimateMeal } from '@/lib/ai';
import { guessMeal } from '@/lib/dates';
import { usePro } from '@/lib/pro';
import { aiLeft, useStore } from '@/lib/store';
import { MEALS, type Meal } from '@/lib/types';

const COLS: { key: keyof MealItem; label: string }[] = [
  { key: 'grams', label: 'g' }, { key: 'kcal', label: 'kcal' }, { key: 'protein', label: 'P' }, { key: 'carbs', label: 'C' }, { key: 'fat', label: 'F' },
];

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
  const edit = (i: number, key: keyof MealItem, v: string) =>
    setResult((r) => r && { ...r, items: r.items.map((it, j) => (j !== i ? it : { ...it, [key]: key === 'name' ? v : Number(v) || 0 })) });

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <T variant="title">Snap a meal</T>
        <T variant="muted">Take a photo of your plate and get a calorie and macro estimate.</T>
      </View>

      <Pressable onPress={() => pick(true)} style={{ borderRadius: Radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.line, backgroundColor: Colors.surface2, overflow: 'hidden', minHeight: 260, alignItems: 'center', justifyContent: 'center' }}>
        {photo ? <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 320 }} contentFit="cover" accessibilityLabel="Your meal photo" /> : (
          <View style={{ alignItems: 'center', gap: 8, padding: 24 }}>
            <T variant="h3">Tap to take a photo</T>
            <T variant="muted">From above works best</T>
          </View>
        )}
      </Pressable>
      <Row>
        <Button title={photo ? 'Retake' : 'Take photo'} kind={photo ? 'secondary' : 'primary'} onPress={() => pick(true)} />
        <Button title="Choose from library" onPress={() => pick(false)} />
        <Button title="Scan a barcode" onPress={() => router.push('/scan')} />
      </Row>
      {!isPro && <T variant="muted">{left} free photo scan{left === 1 ? '' : 's'} left this week. Barcode scans are always free.</T>}

      {photo && !result && (
        <Button title={busy ? 'Looking at your meal…' : 'Estimate calories'} kind="primary" disabled={busy || !aiConfigured} onPress={analyze}
          icon={busy ? <ActivityIndicator color={Colors.accentInk} /> : undefined} />
      )}
      {!aiConfigured && <T variant="muted">Photo estimates need the AI backend. See the README to set EXPO_PUBLIC_AI_URL.</T>}
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}

      {result && (
        <Panel>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="h3" style={{ flex: 1 }}>{result.meal_name || 'Your meal'}</T>
            <T variant="label">{result.confidence} confidence</T>
          </Row>
          {items.length ? items.map((it, i) => (
            <View key={i} style={{ gap: 6, borderTopWidth: 1, borderTopColor: Colors.line, paddingTop: 10 }}>
              <Row style={{ flexWrap: 'nowrap' }}>
                <TextInput value={it.name} onChangeText={(v) => edit(i, 'name', v)} style={{ flex: 1, fontSize: 15, fontWeight: '600', color: Colors.ink }} />
                <Pressable onPress={() => setResult({ ...result, items: items.filter((_, j) => j !== i) })} accessibilityLabel={`Remove ${it.name}`} hitSlop={10}>
                  <T variant="muted">Remove</T>
                </Pressable>
              </Row>
              <Row style={{ flexWrap: 'nowrap', gap: 6 }}>
                {COLS.map((c) => (
                  <View key={c.key} style={{ flex: 1, gap: 2 }}>
                    <T variant="label" style={{ fontSize: 10 }}>{c.label}</T>
                    <TextInput value={String(Math.round(it[c.key] as number))} onChangeText={(v) => edit(i, c.key, v)} keyboardType="number-pad"
                      style={{ fontFamily: Fonts.mono, fontSize: 14, color: Colors.ink, backgroundColor: Colors.bg, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 6 }} />
                  </View>
                ))}
              </Row>
            </View>
          )) : <T>No food found in this photo. Try a clearer shot of the plate.</T>}
          <Row style={{ justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: Colors.ink, paddingTop: 10 }}>
            <T style={{ fontWeight: '700' }}>Total</T>
            <T variant="num">{Math.round(sum.kcal)} kcal · {Math.round(sum.p)}P {Math.round(sum.c)}C {Math.round(sum.f)}F</T>
          </Row>
          {!!result.notes && <T variant="muted">{result.notes}</T>}
          <Segmented value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m, label: m }))} />
          <Button title={`Add ${Math.round(sum.kcal)} kcal to today`} kind="primary" disabled={!items.length} onPress={() => {
            addEntry({ name: result.meal_name || 'Photo meal', ...sum, meal, src: 'photo' });
            setPhoto(null); setResult(null);
            router.navigate('/today');
          }} />
        </Panel>
      )}
    </Screen>
  );
}
