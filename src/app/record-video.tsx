import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecipeVideo } from '@/components/recipe-video';
import { Row } from '@/components/screen';
import { Button, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { keepVideo } from '@/lib/photos';
import { finishFilming } from '@/lib/recorder';

const MAX_SECONDS = 180;
const LIMITS = [15, 60, MAX_SECONDS];

type Phase = 'ready' | 'countdown' | 'recording' | 'paused' | 'review';

/** Full-screen camera for filming a cooking video, like TikTok: tap to record, pause between steps, flip, flash, timer. */
export default function RecordVideo() {
  const [cam, requestCam] = useCameraPermissions();
  const [mic, requestMic] = useMicrophonePermissions();
  const ref = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState(false);
  const [timer, setTimer] = useState(false);
  const [limit, setLimit] = useState(60);
  const [phase, setPhase] = useState<Phase>('ready');
  const [count, setCount] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const done = useRef(false);

  // If the screen is swiped away, tell whoever opened it that nothing was filmed.
  useEffect(() => () => { if (!done.current) finishFilming(null); }, []);

  if (!cam || !mic) return <View style={s.black} />;
  if (!cam.granted || !mic.granted) {
    const blocked = (!cam.granted && !cam.canAskAgain) || (!mic.granted && !mic.canAskAgain);
    return (
      <SafeAreaView style={[s.black, { padding: 24, justifyContent: 'center', gap: 14 }]}>
        <T variant="h2" style={{ color: '#fff' }}>Film your cooking</T>
        <T style={{ color: 'rgba(255,255,255,0.8)' }}>Biteboard needs the camera and microphone to film videos of you making food.</T>
        <Button title={blocked ? 'Open Settings' : 'Allow camera and mic'} kind="primary"
          onPress={blocked ? () => Linking.openSettings() : async () => { if (!cam.granted) await requestCam(); if (!mic.granted) await requestMic(); }} />
        <Button title="Not now" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const canPause = !!ref.current?.getSupportedFeatures().toggleRecordingAsyncAvailable;

  const start = async () => {
    if (!ref.current || !ready) return;
    setSeconds(0);
    setPhase('recording');
    try {
      const res = await ref.current.recordAsync({ maxDuration: limit, progressUpdateInterval: 0.2 });
      if (res?.uri) { setUri(res.uri); setPhase('review'); } else setPhase('ready');
    } catch {
      setPhase('ready');
    }
  };

  const press = () => {
    if (phase === 'ready') {
      if (!timer) return start();
      setPhase('countdown');
      let n = 3;
      setCount(n);
      const t = setInterval(() => {
        n -= 1;
        setCount(n);
        if (n === 0) { clearInterval(t); start(); }
      }, 1000);
    } else if (phase === 'recording' || phase === 'paused') {
      ref.current?.stopRecording();
    }
  };

  const togglePause = async () => {
    await ref.current?.toggleRecordingAsync();
    setPhase(phase === 'paused' ? 'recording' : 'paused');
  };

  const use = async () => {
    if (!uri) return;
    setSaving(true);
    const kept = await keepVideo(uri).catch(() => uri);
    done.current = true;
    finishFilming(kept);
    router.back();
  };

  if (phase === 'review' && uri) {
    return (
      <View style={s.black}>
        <RecipeVideo uri={uri} autoPlay controls={false} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['bottom']} style={s.bottom}>
          <Row style={{ justifyContent: 'center', gap: 12 }}>
            <Button title="Retake" onPress={() => { setUri(null); setPhase('ready'); }} />
            {saving ? <ActivityIndicator color="#fff" /> : <Button title="Use this video" kind="primary" onPress={use} />}
          </Row>
        </SafeAreaView>
      </View>
    );
  }

  const live = phase === 'recording' || phase === 'paused';
  const mm = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;

  return (
    <View style={s.black}>
      <CameraView ref={ref} style={StyleSheet.absoluteFill} mode="video" facing={facing} enableTorch={torch} videoQuality="720p"
        mirror={facing === 'front'} onCameraReady={() => setReady(true)} onRecordingProgress={(e) => setSeconds(e.duration)} />

      <SafeAreaView edges={['top']} style={s.top}>
        <View style={s.bar}><View style={[s.fill, { width: `${Math.min(100, (seconds / limit) * 100)}%` }]} /></View>
        <Row style={{ justifyContent: 'space-between' }}>
          <Tool label="Close" onPress={() => router.back()} />
          {live ? <T style={s.time}>{mm(seconds)} / {mm(limit)}</T> : (
            <Row style={{ gap: 6 }}>
              {LIMITS.map((l) => <Tool key={l} label={l < 60 ? `${l}s` : `${l / 60}m`} on={limit === l} onPress={() => setLimit(l)} />)}
            </Row>
          )}
          <View style={{ gap: 10, alignItems: 'flex-end' }}>
            {!live && <Tool label="Flip" onPress={() => setFacing(facing === 'back' ? 'front' : 'back')} />}
            {facing === 'back' && <Tool label="Flash" on={torch} onPress={() => setTorch(!torch)} />}
            {!live && <Tool label="3s timer" on={timer} onPress={() => setTimer(!timer)} />}
          </View>
        </Row>
      </SafeAreaView>

      {phase === 'countdown' && <View style={s.center}><T style={s.count}>{count}</T></View>}

      <SafeAreaView edges={['bottom']} style={s.bottom}>
        <T style={s.hint}>{phase === 'paused' ? 'Paused. Set up the next step, then resume.' : live ? 'Tap to finish' : 'Tap to start filming'}</T>
        <Row style={{ justifyContent: 'center', gap: 28 }}>
          <View style={{ width: 72 }}>{live && canPause && <Tool label={phase === 'paused' ? 'Resume' : 'Pause'} onPress={togglePause} />}</View>
          <Pressable onPress={press} disabled={!ready || phase === 'countdown'} accessibilityRole="button" accessibilityLabel={live ? 'Stop recording' : 'Start recording'} style={s.ring}>
            <View style={live ? s.stop : s.dot} />
          </Pressable>
          <View style={{ width: 72 }} />
        </Row>
      </SafeAreaView>
    </View>
  );
}

function Tool({ label, onPress, on }: { label: string; onPress: () => void; on?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!on }}
      style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: on ? '#fff' : 'rgba(0,0,0,0.4)' }}>
      <T style={{ color: on ? Colors.ink : '#fff', fontWeight: '700', fontSize: 13 }}>{label}</T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, padding: 16, gap: 12 },
  bar: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  fill: { height: 4, backgroundColor: Colors.accent },
  time: { color: '#fff', fontWeight: '700', fontVariant: ['tabular-nums'] },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  count: { color: '#fff', fontSize: 120, fontWeight: '800' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 24, gap: 14, alignItems: 'center' },
  hint: { color: '#fff', fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  ring: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E5484D' },
  stop: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#E5484D' },
});
