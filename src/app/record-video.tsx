import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { RecipeVideo } from '@/components/recipe-video';
import { Row } from '@/components/screen';
import { Button, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { keepVideo } from '@/lib/photos';
import { finishFilming } from '@/lib/recorder';

const LIMITS = [15, 60, 180];
const SPEEDS = [{ v: 0.5, label: 'Slow' }, { v: 1, label: '1x' }, { v: 2, label: 'Fast' }];

type Phase = 'ready' | 'countdown' | 'recording' | 'paused' | 'review';

const ICONS = {
  flip: 'M4 7h11l-3-3M20 17H9l3 3M20 7v4M4 17v-4',
  flash: 'M13 2L4 14h7l-1 8 9-12h-7z',
  timer: 'M12 8v5l3 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  speed: 'M4 18a8 8 0 1 1 16 0M12 18l4-6',
  close: 'M6 6l12 12M18 6L6 18',
};

/** Biteboard's own camera for cooking videos: tap to film, pause between steps, flip, flash, timer, slow or fast motion. */
export default function RecordVideo() {
  const { post } = useLocalSearchParams<{ post?: string }>();
  const [cam, requestCam] = useCameraPermissions();
  const [mic, requestMic] = useMicrophonePermissions();
  const ref = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState(false);
  const [timer, setTimer] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
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
    setShowSpeed(false);
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

  const close = () => router.back();
  // A new post goes on to the caption and recipe details; otherwise the video goes back to whoever asked.
  const next = (video: { uri: string; speed: number } | null) => {
    done.current = true;
    const waiting = finishFilming(video);
    if (post && !waiting) router.replace({ pathname: '/write-recipe', params: video ? { video: video.uri, speed: String(video.speed) } : {} });
    else router.back();
  };

  const use = async () => {
    if (!uri) return;
    setSaving(true);
    const kept = await keepVideo(uri).catch(() => uri);
    next({ uri: kept, speed });
  };

  if (phase === 'review' && uri) {
    return (
      <View style={s.black}>
        <RecipeVideo uri={uri} autoPlay controls={false} speed={speed} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['top']} style={s.top}>
          <Row style={{ justifyContent: 'space-between' }}>
            <IconButton icon="close" label="Back" onPress={() => { setUri(null); setPhase('ready'); }} />
            {speed !== 1 && <Pill label={speed < 1 ? 'Slow motion' : 'Fast motion'} />}
          </Row>
        </SafeAreaView>
        <SafeAreaView edges={['bottom']} style={s.bottom}>
          <Row style={{ justifyContent: 'center', gap: 12, paddingHorizontal: 16 }}>
            <Pressable onPress={() => { setUri(null); setPhase('ready'); }} style={[s.big, { backgroundColor: 'rgba(255,255,255,0.18)' }]}><T style={s.bigText}>Retake</T></Pressable>
            <Pressable onPress={use} disabled={saving} style={[s.big, { backgroundColor: Colors.accent, flex: 1.4 }]}>
              {saving ? <ActivityIndicator color="#fff" /> : <T style={s.bigText}>{post ? 'Next' : 'Use video'}</T>}
            </Pressable>
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
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {!live ? <IconButton icon="close" label="Close" onPress={close} /> : <View />}
          {live ? <Pill label={`${mm(seconds)} / ${mm(limit)}`} /> : <T style={s.brand}>Biteboard</T>}
          <View style={{ width: 44 }} />
        </Row>
      </SafeAreaView>

      {/* Tools down the right side, like TikTok. */}
      <SafeAreaView edges={['top']} style={s.side}>
        {!live && <IconButton icon="flip" label="Flip" onPress={() => setFacing(facing === 'back' ? 'front' : 'back')} />}
        {facing === 'back' && <IconButton icon="flash" label="Flash" on={torch} onPress={() => setTorch(!torch)} />}
        {!live && <IconButton icon="speed" label={speed === 1 ? 'Speed' : speed < 1 ? 'Slow' : 'Fast'} on={speed !== 1} onPress={() => setShowSpeed(!showSpeed)} />}
        {!live && <IconButton icon="timer" label="3s" on={timer} onPress={() => setTimer(!timer)} />}
      </SafeAreaView>

      {phase === 'countdown' && <View style={s.center}><T style={s.count}>{count}</T></View>}

      <SafeAreaView edges={['bottom']} style={s.bottom}>
        {showSpeed && !live && (
          <View style={s.seg}>
            {SPEEDS.map((x) => (
              <Pressable key={x.v} onPress={() => setSpeed(x.v)} style={[s.segItem, speed === x.v && s.segOn]} accessibilityState={{ selected: speed === x.v }}>
                <T style={[s.segText, speed === x.v && { color: Colors.ink }]}>{x.label}</T>
              </Pressable>
            ))}
          </View>
        )}
        <T style={s.hint}>{phase === 'paused' ? 'Paused. Set up the next step, then resume.' : live ? 'Tap to finish' : 'Tap to film'}</T>
        <Row style={{ justifyContent: 'center', gap: 28 }}>
          <View style={{ width: 76, alignItems: 'center' }}>
            {live && canPause && <Pressable onPress={togglePause} style={s.small}><T style={s.smallText}>{phase === 'paused' ? 'Resume' : 'Pause'}</T></Pressable>}
            {!live && post && <Pressable onPress={() => next(null)} style={s.small}><T style={s.smallText}>No video</T></Pressable>}
          </View>
          <Pressable onPress={press} disabled={!ready || phase === 'countdown'} accessibilityRole="button" accessibilityLabel={live ? 'Stop filming' : 'Start filming'} style={s.ring}>
            <View style={live ? s.stop : s.dot} />
          </Pressable>
          <View style={{ width: 76 }} />
        </Row>
        {!live && (
          <Row style={{ justifyContent: 'center', gap: 18 }}>
            {LIMITS.map((l) => (
              <Pressable key={l} onPress={() => setLimit(l)} hitSlop={8}>
                <T style={[s.limit, limit === l && { color: '#fff', textDecorationLine: 'underline' }]}>{l < 60 ? `${l}s` : `${l / 60}m`}</T>
              </Pressable>
            ))}
          </Row>
        )}
      </SafeAreaView>
    </View>
  );
}

function IconButton({ icon, label, onPress, on }: { icon: keyof typeof ICONS; label: string; onPress: () => void; on?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!on }} style={{ alignItems: 'center', gap: 3, width: 52 }} hitSlop={6}>
      <View style={[s.icon, on && { backgroundColor: Colors.accent }]}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d={ICONS[icon]} />
          {icon === 'speed' && <Circle cx={12} cy={18} r={1.5} fill="#fff" />}
        </Svg>
      </View>
      <T style={s.iconLabel}>{label}</T>
    </Pressable>
  );
}

const Pill = ({ label }: { label: string }) => (
  <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.45)' }}>
    <T style={{ color: '#fff', fontWeight: '700', fontVariant: ['tabular-nums'] }}>{label}</T>
  </View>
);

const s = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  side: { position: 'absolute', top: 70, right: 10, gap: 16, alignItems: 'center' },
  bar: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  fill: { height: 3, backgroundColor: Colors.accent },
  brand: { color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: -0.3, marginTop: 10 },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  iconLabel: { color: '#fff', fontSize: 11, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3 },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  count: { color: '#fff', fontSize: 120, fontWeight: '800' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 20, gap: 14, alignItems: 'center' },
  hint: { color: '#fff', fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  ring: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 66, height: 66, borderRadius: 33, backgroundColor: Colors.accent },
  stop: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.accent },
  small: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.45)' },
  smallText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  limit: { color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontSize: 14 },
  seg: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, padding: 4 },
  segItem: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999 },
  segOn: { backgroundColor: '#fff' },
  segText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  big: { flex: 1, height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  bigText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
