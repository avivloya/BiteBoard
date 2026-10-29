import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Logo } from '@/components/logo';
import { FILTER_TINT, RecipeVideo, type VideoFilter } from '@/components/recipe-video';
import { Row } from '@/components/screen';
import { Button, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { keepVideo, pickRecipeVideo } from '@/lib/photos';
import { cutsToParam, type Filmed, finishFilming } from '@/lib/recorder';

const LIMITS = [15, 60, 180];
const FILTERS: { v: VideoFilter; label: string }[] = [{ v: 'none', label: 'None' }, { v: 'beauty', label: 'Beauty' }, { v: 'warm', label: 'Warm' }, { v: 'bright', label: 'Bright' }];
const SPEEDS = [{ v: 0.5, label: 'Slow' }, { v: 1, label: 'Normal' }, { v: 2, label: 'Fast' }];
const speedName = (v: number) => (v < 1 ? 'Slow' : v > 1 ? 'Fast' : '1x');
const mmss = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
const GLASS = 'rgba(255,255,255,0.16)';
const RED = '#FF5A4F';

type Phase = 'ready' | 'countdown' | 'recording' | 'paused' | 'review';
type Icon = 'flip' | 'flash' | 'speed' | 'timer' | 'close' | 'back' | 'trim' | 'upload' | 'pause' | 'play' | 'filter' | 'check' | 'undo';

function Glyph({ name, color = '#fff', size = 22 }: { name: Icon; color?: string; size?: number }) {
  const p = { stroke: color, strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'flip' && <Path {...p} d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" />}
      {name === 'flash' && <Path {...p} d="M13 2L4 14h7l-1 8 9-12h-7z" />}
      {name === 'speed' && <Path {...p} d="M12 21a9 9 0 1 1 9-9M12 12l5-4" />}
      {name === 'timer' && <><Circle {...p} cx={12} cy={13} r={8} /><Path {...p} d="M12 9v4l2.5 2M9 2h6" /></>}
      {name === 'close' && <Path {...p} d="M6 6l12 12M18 6L6 18" />}
      {name === 'back' && <Path {...p} d="M15 5l-7 7 7 7" />}
      {name === 'trim' && <Path {...p} d="M6 4v16M18 4v16M6 8h12M6 16h12" />}
      {name === 'upload' && <><Rect {...p} x={3} y={3} width={18} height={18} rx={4} /><Circle {...p} cx={9} cy={9} r={2} /><Path {...p} d="M21 15l-5-5L5 21" /></>}
      {name === 'pause' && <Path {...p} d="M9 5v14M15 5v14" />}
      {name === 'play' && <Path {...p} d="M7 5l12 7-12 7z" />}
      {name === 'filter' && <><Circle {...p} cx={12} cy={12} r={9} /><Path {...p} d="M12 3a9 9 0 0 1 0 18M8 7l2 2M6 12h3" /></>}
      {name === 'undo' && <Path {...p} d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />}
      {name === 'check' && <Path {...p} d="M5 12.5l4.5 4.5L19 7" />}
    </Svg>
  );
}

/** Biteboard's own video recorder: a record button to start and stop, tools down the side, then trim and speed before posting. */
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
  const [panel, setPanel] = useState<'speed' | 'trim' | 'filter' | null>(null);
  const [filter, setFilter] = useState<VideoFilter>('none');
  const [limit, setLimit] = useState(60);
  const [phase, setPhase] = useState<Phase>('ready');
  const [count, setCount] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [trim, setTrim] = useState<[number, number] | null>(null);
  const [saving, setSaving] = useState(false);
  // Each hold is a clip, in seconds of the file. Deleting a clip skips it on playback.
  const [clips, setClips] = useState<[number, number | null][]>([]);
  const [cuts, setCuts] = useState<[number, number][]>([]);
  const fileSecs = useRef(0);
  const discard = useRef(false);
  const done = useRef(false);

  // If the screen is swiped away, tell whoever opened it that nothing was filmed.
  useEffect(() => () => { if (!done.current) finishFilming(null); }, []);

  const close = () => router.back();
  // A new post goes on to the caption and recipe details; otherwise the video goes back to whoever asked.
  const next = (video: Filmed | null) => {
    done.current = true;
    const waiting = finishFilming(video);
    if (post && !waiting) {
      const params: Record<string, string> = video ? { video: video.uri, speed: String(video.speed) } : {};
      if (video?.trim) { params.start = String(video.trim[0]); params.end = String(video.trim[1]); }
      if (video?.filter && video.filter !== 'none') params.filter = video.filter;
      if (video?.cuts?.length) params.cuts = cutsToParam(video.cuts);
      router.replace({ pathname: '/write-recipe', params });
    } else router.back();
  };
  const review = (u: string, secs: number) => { if (!secs) { setClips([]); setCuts([]); } setUri(u); setDuration(secs); setTrim(null); setPanel(null); setPhase('review'); };
  const upload = async () => { const u = await pickRecipeVideo(); if (u) review(u, 0); };

  const canPause = !!ref.current?.getSupportedFeatures().toggleRecordingAsyncAvailable;
  const live = phase === 'recording' || phase === 'paused';

  const start = async () => {
    if (!ref.current || !ready) return;
    setSeconds(0);
    setPanel(null);
    fileSecs.current = 0;
    discard.current = false;
    setClips([[0, null]]);
    setCuts([]);
    setPhase('recording');
    try {
      const res = await ref.current.recordAsync({ maxDuration: limit, progressUpdateInterval: 0.2 });
      if (discard.current) { discard.current = false; setClips([]); setSeconds(0); setPhase('ready'); return; }
      if (res?.uri) { setUri(res.uri); setDuration(0); setTrim(null); setPanel(null); setPhase('review'); } else setPhase('ready');
    } catch {
      setPhase('ready');
    }
  };

  // Record button: hold to film and let go to pause, or tap to start and tap to pause. ✓ finishes the video.
  // Phones that can't pause a recording (older iPhones) finish it when you let go instead.
  const pressRef = useRef<{ t: number; was: Phase } | null>(null);
  const pause = async () => {
    if (!canPause) return ref.current?.stopRecording();
    await ref.current?.toggleRecordingAsync();
    setClips((c) => c.map((x, i) => (i === c.length - 1 ? [x[0], fileSecs.current] : x)));
    setPhase('paused');
  };
  // Delete the last clip. Deleting the only clip starts over.
  const undo = () => {
    if (phase !== 'paused' || !clips.length) return;
    const last = clips[clips.length - 1];
    if (clips.length === 1) { discard.current = true; ref.current?.stopRecording(); return; }
    setCuts((c) => [...c, [last[0], last[1] ?? fileSecs.current]]);
    setClips(clips.slice(0, -1));
  };
  const kept = clips.reduce((n, [a, b]) => n + ((b ?? fileSecs.current) - a), 0);
  const pressIn = async () => {
    pressRef.current = { t: Date.now(), was: phase };
    if (phase === 'paused') { await ref.current?.toggleRecordingAsync(); setClips((c) => [...c, [fileSecs.current, null]]); setPhase('recording'); return; }
    if (phase === 'ready') press();
  };
  const pressOut = () => {
    const p = pressRef.current;
    pressRef.current = null;
    if (!p || (p.was === 'ready' && timer)) return;
    if (p.was === 'recording' || Date.now() - p.t > 300) pause();
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
    }
  };

  const renderReview = () => {
    const t = trim ?? [0, duration];
    const nudge = (i: 0 | 1, d: number) => {
      const x = [...t] as [number, number];
      x[i] = Math.round(Math.max(0, Math.min(duration, x[i] + d)) * 10) / 10;
      if (x[1] - x[0] < 1) return;
      setTrim(x);
    };
    const use = async () => {
      if (!uri) return;
      setSaving(true);
      const kept = await keepVideo(uri).catch(() => uri);
      next({ uri: kept, speed, trim: trim ?? undefined, filter, cuts: cuts.length ? cuts : undefined });
    };
    return (
      <View style={s.black}>
        <RecipeVideo uri={uri!} autoPlay controls={false} speed={speed} filter={filter} trim={trim ?? undefined} cuts={cuts} onDuration={(d) => { if (!duration) setDuration(Math.round(d * 10) / 10); }} style={StyleSheet.absoluteFill} />
        <Shade />
        <SafeAreaView edges={['top']} style={s.top}>
          <Pressable onPress={() => { setUri(null); setPhase('ready'); }} style={s.round} accessibilityLabel="Retake"><Glyph name="back" /></Pressable>
          <Brand />
          <View style={{ width: 42 }} />
        </SafeAreaView>
        <SafeAreaView edges={['top']} style={s.side}>
          <Tool icon="trim" label="Trim" on={panel === 'trim' || !!trim} onPress={() => setPanel(panel === 'trim' ? null : 'trim')} />
          <Tool icon="speed" label={speedName(speed)} on={panel === 'speed' || speed !== 1} onPress={() => setPanel(panel === 'speed' ? null : 'speed')} />
        </SafeAreaView>
        <SafeAreaView edges={['bottom']} style={s.bottom}>
          {panel === 'speed' && speeds()}
          {panel === 'trim' && duration > 0 && (
            <View style={s.card}>
              {([0, 1] as const).map((i) => (
                <Row key={i} style={{ justifyContent: 'space-between' }}>
                  <T style={s.cardText}>{i ? 'End' : 'Start'} {mmss(t[i])}</T>
                  <Row style={{ gap: 8 }}>
                    <Pressable onPress={() => nudge(i, -0.5)} style={s.step} accessibilityLabel={`${i ? 'End' : 'Start'} earlier`}><T style={s.cardText}>−</T></Pressable>
                    <Pressable onPress={() => nudge(i, 0.5)} style={s.step} accessibilityLabel={`${i ? 'End' : 'Start'} later`}><T style={s.cardText}>+</T></Pressable>
                  </Row>
                </Row>
              ))}
            </View>
          )}
          <Row style={{ gap: 12, paddingHorizontal: 20, flexWrap: 'nowrap' }}>
            <Pressable onPress={() => { setUri(null); setPhase('ready'); }} style={[s.big, { backgroundColor: GLASS }]}><T style={s.bigText}>Retake</T></Pressable>
            <Pressable onPress={use} disabled={saving} style={[s.big, { backgroundColor: Colors.bg, flex: 1.5 }]}>
              {saving ? <ActivityIndicator color={Colors.ink} /> : <T style={[s.bigText, { color: Colors.ink }]}>{post ? 'Next' : 'Use video'}</T>}
            </Pressable>
          </Row>
        </SafeAreaView>
      </View>
    );
  };

  const speeds = () => (
      <View style={s.seg}>
        {SPEEDS.map((x) => (
          <Pressable key={x.v} onPress={() => setSpeed(x.v)} style={[s.segItem, speed === x.v && { backgroundColor: Colors.bg }]} accessibilityState={{ selected: speed === x.v }}>
            <T style={[s.segText, speed === x.v && { color: Colors.ink }]}>{x.label}</T>
          </Pressable>
        ))}
      </View>
  );


  if (phase === 'review' && uri) return renderReview();
  if (!cam || !mic) return <View style={s.black} />;
  if (!cam.granted || !mic.granted) {
    const blocked = (!cam.granted && !cam.canAskAgain) || (!mic.granted && !mic.canAskAgain);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg, padding: 24 }}>
        <Pressable onPress={close} style={[s.round, { backgroundColor: Colors.surface2 }]} accessibilityLabel="Close"><Glyph name="close" color={Colors.ink} /></Pressable>
        <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
          <Row><Logo /><T style={{ fontWeight: '800', fontSize: 18, color: Colors.ink }}>Biteboard</T></Row>
          <T variant="title">Film your cooking</T>
          <T>Biteboard needs your camera and microphone to film videos of you making food.</T>
          <Button title={blocked ? 'Open Settings' : 'Allow camera and mic'} kind="primary"
            onPress={blocked ? () => Linking.openSettings() : async () => { if (!cam.granted) await requestCam(); if (!mic.granted) await requestMic(); }} />
          <Button title="Upload a video instead" onPress={upload} />
          {!!post && <Button title="Post without a video" kind="ghost" onPress={() => next(null)} />}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={s.black}>
      <CameraView ref={ref} style={StyleSheet.absoluteFill} mode="video" facing={facing} enableTorch={torch} videoQuality="1080p" videoBitrate={8_000_000}
        mirror={facing === 'front'} onCameraReady={() => setReady(true)} onRecordingProgress={(e) => { fileSecs.current = e.duration; setSeconds(e.duration); }} />
      {FILTER_TINT[filter] && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: FILTER_TINT[filter] }]} />}
      <Shade />

      {live && <SafeAreaView edges={['top']} style={s.barWrap}><View style={s.bar}><View style={[s.fill, { width: `${Math.min(100, (kept / limit) * 100)}%` }]} /></View></SafeAreaView>}
      <SafeAreaView edges={['top']} style={s.top}>
        {live ? <View style={{ width: 42 }} /> : <Pressable onPress={close} style={s.round} accessibilityLabel="Close"><Glyph name="close" /></Pressable>}
        {live ? (
          <View style={s.time}><View style={[s.dotSmall, phase === 'paused' && { backgroundColor: Colors.bg }]} /><T style={s.timeText}>{mmss(kept)}</T></View>
        ) : <Brand />}
        <View style={{ width: 42 }} />
      </SafeAreaView>

      {/* Tools down the right side, like TikTok. */}
      <SafeAreaView edges={['top']} style={s.side}>
        {phase === 'paused' && clips.length > 0 && <Tool icon="undo" label="Delete" onPress={undo} />}
        {!live && <Tool icon="flip" label="Flip" onPress={() => setFacing(facing === 'back' ? 'front' : 'back')} />}
        {facing === 'back' && <Tool icon="flash" label="Flash" on={torch} onPress={() => setTorch(!torch)} />}
        {!live && <Tool icon="speed" label={speedName(speed)} on={speed !== 1} onPress={() => setPanel(panel === 'speed' ? null : 'speed')} />}
        {!live && <Tool icon="filter" label={filter === 'none' ? 'Filter' : FILTERS.find((f) => f.v === filter)!.label} on={filter !== 'none'} onPress={() => setPanel(panel === 'filter' ? null : 'filter')} />}
        {!live && <Tool icon="timer" label={timer ? '3s' : 'Timer'} on={timer} onPress={() => setTimer(!timer)} />}
      </SafeAreaView>

      {phase === 'countdown' && <View style={s.center}><T style={s.count}>{count}</T></View>}

      <SafeAreaView edges={['bottom']} style={s.bottom}>
        {panel === 'speed' && !live && speeds()}
        {panel === 'filter' && !live && (
          <View style={s.seg}>
            {FILTERS.map((x) => (
              <Pressable key={x.v} onPress={() => setFilter(x.v)} style={[s.segItem, filter === x.v && { backgroundColor: Colors.bg }]} accessibilityState={{ selected: filter === x.v }}>
                <T style={[s.segText, filter === x.v && { color: Colors.ink }]}>{x.label}</T>
              </Pressable>
            ))}
          </View>
        )}
        <View style={s.ctrls}>
          <View style={s.side3}>
            {!live && <Square icon="upload" label="Upload" onPress={upload} />}
          </View>
          <Pressable onPressIn={pressIn} onPressOut={pressOut} disabled={!ready || phase === 'countdown'} accessibilityRole="button"
            accessibilityLabel={phase === 'recording' ? 'Pause recording' : 'Record'} style={[s.shutter, !ready && { opacity: 0.5 }]}>
            <View style={s.dot} />
            <Spinner on={phase === 'recording'} />
          </Pressable>
          <View style={s.side3}>
            {live && kept >= 0.5 && (
              <Pressable onPress={() => ref.current?.stopRecording()} style={{ alignItems: 'center', gap: 4 }} accessibilityRole="button" accessibilityLabel="Done filming">
                <View style={[s.square, { backgroundColor: Colors.bg }]}><Glyph name="check" color={Colors.ink} size={24} /></View>
                <T style={s.squareLabel}>Done</T>
              </Pressable>
            )}
            {!live && !!post && (
              <Pressable onPress={() => next(null)} style={{ alignItems: 'center', gap: 4 }} accessibilityLabel="Post without a video">
                <View style={s.square}><T style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Skip</T></View>
                <T style={s.squareLabel}>No video</T>
              </Pressable>
            )}
          </View>
        </View>
        {live ? <T style={s.hint}>{phase === 'paused' ? "Hold or tap to keep filming. Tap ✓ when you're done." : canPause ? 'Let go or tap to pause' : 'Let go to finish'}</T> : (
          <>
          <T style={s.hint}>Hold to film, or tap</T>
          <View style={s.seg}>
            {LIMITS.map((l) => (
              <Pressable key={l} onPress={() => setLimit(l)} style={[s.segItem, limit === l && { backgroundColor: Colors.bg }]} accessibilityState={{ selected: limit === l }}>
                <T style={[s.segText, limit === l && { color: Colors.ink }]}>{l < 60 ? `${l}s` : `${l / 60}m`}</T>
              </Pressable>
            ))}
          </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

/** A thin arc that spins around the record button while filming. */
function Spinner({ on }: { on: boolean }) {
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) { turn.stopAnimation(); return; }
    const loop = Animated.loop(Animated.timing(turn, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
    turn.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [on, turn]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View pointerEvents="none" style={[s.spin, { opacity: on ? 1 : 0, transform: [{ rotate }] }]} />;
}

const Brand = () => (
  <Row style={{ gap: 7 }}>
    <Logo size={20} color={Colors.bg} ring="rgba(29,20,13,0.35)" />
    <T style={{ color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: -0.3 }}>Biteboard</T>
  </Row>
);

const Shade = () => (
  <>
    <View pointerEvents="none" style={[s.shade, { top: 0, height: 150, backgroundColor: 'rgba(29,20,13,0.28)' }]} />
    <View pointerEvents="none" style={[s.shade, { bottom: 0, height: 240, backgroundColor: 'rgba(29,20,13,0.38)' }]} />
  </>
);

function Tool({ icon, label, onPress, on }: { icon: Icon; label: string; onPress: () => void; on?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!on }} style={{ alignItems: 'center', gap: 4, width: 50 }} hitSlop={6}>
      <View style={[s.toolIcon, on && { backgroundColor: Colors.bg }]}><Glyph name={icon} color={on ? Colors.ink : '#fff'} /></View>
      <T style={s.toolLabel}>{label}</T>
    </Pressable>
  );
}

function Square({ icon, label, onPress }: { icon: Icon; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', gap: 4 }} accessibilityRole="button" accessibilityLabel={label}>
      <View style={s.square}><Glyph name={icon} /></View>
      <T style={s.squareLabel}>{label}</T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#1D140D' },
  shade: { position: 'absolute', left: 0, right: 0 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  barWrap: { position: 'absolute', top: 0, left: 16, right: 16, paddingTop: 4 },
  bar: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  fill: { height: 3, backgroundColor: Colors.bg },
  time: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: GLASS },
  timeText: { color: '#fff', fontWeight: '700', fontVariant: ['tabular-nums'] },
  dotSmall: { width: 8, height: 8, borderRadius: 4, backgroundColor: RED },
  side: { position: 'absolute', top: 76, right: 12, gap: 18, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center' },
  toolIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { color: '#fff', fontSize: 10.5, fontWeight: '700' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  count: { color: '#fff', fontSize: 120, fontWeight: '800' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 22, gap: 16, alignItems: 'center' },
  ctrls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 360 },
  side3: { flex: 1, alignItems: 'center' },
  shutter: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: Colors.bg, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 66, height: 66, borderRadius: 33, backgroundColor: Colors.accent },
  spin: { position: 'absolute', top: -11, left: -11, right: -11, bottom: -11, borderRadius: 999, borderWidth: 4, borderColor: 'transparent', borderTopColor: Colors.bg, borderRightColor: 'rgba(226,206,177,0.45)' },
  square: { width: 48, height: 48, borderRadius: 14, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  squareLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
  hint: { color: '#fff', fontSize: 13, fontWeight: '600', opacity: 0.85 },
  seg: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' },
  segItem: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999 },
  segText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { width: '90%', maxWidth: 420, gap: 10, padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)' },
  cardText: { color: '#fff', fontWeight: '700' },
  step: { width: 36, height: 32, borderRadius: 10, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  big: { flex: 1, height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  bigText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
