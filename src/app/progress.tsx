import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { type ComponentRef, useRef, useState } from 'react';
import { Alert, PanResponder, Platform, Pressable, ScrollView, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Button, Panel, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { dayKey } from '@/lib/dates';
import { type ProgressPhoto, useExtras } from '@/lib/extras';
import { haptic } from '@/lib/haptics';
import { kgToLb } from '@/lib/plan';
import { shareView } from '@/lib/share-image';
import { useStore } from '@/lib/store';

const uid = () => Math.random().toString(36).slice(2, 10);

async function keep(uri: string) {
  if (Platform.OS === 'web') return uri;
  const dir = new Directory(Paths.document, 'progress-photos');
  if (!dir.exists) dir.create({ intermediates: true });
  const dest = new File(dir, `${Date.now()}.jpg`);
  await new File(uri).copy(dest);
  return dest.uri;
}

/** Private progress photos with a before/after slider. They stay on this phone. */
export default function Progress() {
  const { progress, set } = useExtras();
  const { weights, profile } = useStore();
  const imperial = profile?.units === 'imperial';
  const sorted = [...progress].sort((a, b) => a.day.localeCompare(b.day));
  const [pair, setPair] = useState<[string, string] | null>(null);
  const before = sorted.find((p) => p.id === pair?.[0]) ?? sorted[0];
  const after = sorted.find((p) => p.id === pair?.[1]) ?? sorted[sorted.length - 1];
  const shot = useRef<ComponentRef<typeof View>>(null);

  const add = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Access needed', 'Allow camera or photos for Snapspoon in Settings.');
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [3, 4] };
    const res = camera ? await ImagePicker.launchCameraAsync({ ...opts, cameraType: ImagePicker.CameraType.front }) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets[0]) return;
    const day = dayKey();
    const kg = weights[day] ?? profile?.weightKg;
    set({ progress: [...progress, { id: uid(), uri: await keep(res.assets[0].uri), day, kg }] });
    haptic.success();
  };

  const remove = (p: ProgressPhoto) => Alert.alert('Delete this photo?', p.day, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => {
      set({ progress: progress.filter((x) => x.id !== p.id) });
      try { if (Platform.OS !== 'web') new File(p.uri).delete(); } catch {}
    } },
  ]);
  const w = (kg?: number) => (kg ? `${Math.round((imperial ? kgToLb(kg) : kg) * 10) / 10} ${imperial ? 'lb' : 'kg'}` : '');

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Progress photos</T>
      <T variant="muted">Only you can see these. They are saved on this phone.</T>
      <Row style={{ flexWrap: 'nowrap' }}>
        <Button title="Take photo" kind="primary" style={{ flex: 1 }} onPress={() => add(true)} />
        <Button title="From library" style={{ flex: 1 }} onPress={() => add(false)} />
      </Row>

      {sorted.length >= 2 && before && after && before.id !== after.id && (
        <>
          <View ref={shot} collapsable={false} style={{ backgroundColor: Colors.bg, borderRadius: Radius.lg, padding: 10, gap: 8 }}>
            <Compare before={before.uri} after={after.uri} />
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="muted">Before · {before.day} {w(before.kg)}</T>
              <T variant="muted">After · {after.day} {w(after.kg)}</T>
            </Row>
          </View>
          <Button title="Share comparison" onPress={() => shareView(shot, 'My progress')} />
          <T variant="muted" style={{ fontSize: 12 }}>Tap a photo below to set it as before, long-press to set it as after.</T>
        </>
      )}

      {sorted.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {sorted.map((p) => (
            <Pressable key={p.id} onPress={() => setPair([p.id, after?.id ?? p.id])} onLongPress={() => setPair([before?.id ?? p.id, p.id])} delayLongPress={300}>
              <Image source={{ uri: p.uri }} style={{ width: 110, height: 146, borderRadius: Radius.md, borderWidth: p.id === before?.id || p.id === after?.id ? 3 : 0, borderColor: Colors.accent }} contentFit="cover" />
              <T variant="muted" style={{ fontSize: 11, marginTop: 4 }}>{p.day}</T>
              <Pressable onPress={() => remove(p)} hitSlop={8}><T variant="muted" style={{ fontSize: 11 }}>Delete</T></Pressable>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Panel><T variant="muted">Take a photo today and another in a few weeks. The slider shows how far you have come.</T></Panel>
      )}
    </Screen>
  );
}

/** Drag the handle to reveal the after photo over the before photo. */
function Compare({ before, after }: { before: string; after: string }) {
  const [width, setWidth] = useState(0);
  const [x, setX] = useState(0.5);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => setX(e.nativeEvent.locationX / (widthRef.current || 1)),
    onPanResponderMove: (e) => setX(Math.min(1, Math.max(0, e.nativeEvent.locationX / (widthRef.current || 1)))),
  })).current;
  const widthRef = useRef(0);
  return (
    <View onLayout={(e) => { setWidth(e.nativeEvent.layout.width); widthRef.current = e.nativeEvent.layout.width; }} style={{ aspectRatio: 3 / 4, borderRadius: Radius.md, overflow: 'hidden' }} {...pan.panHandlers}>
      <Image source={{ uri: before }} style={{ position: 'absolute', inset: 0 } as never} contentFit="cover" />
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: width * x, right: 0, overflow: 'hidden' }}>
        <Image source={{ uri: after }} style={{ position: 'absolute', top: 0, bottom: 0, width, left: -width * x }} contentFit="cover" />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: width * x - 1.5, width: 3, backgroundColor: '#fff' }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: '50%', left: width * x - 18, width: 36, height: 36, marginTop: -18, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ color: '#4A2E1C', fontWeight: '800' }}>⇆</T>
      </View>
    </View>
  );
}
