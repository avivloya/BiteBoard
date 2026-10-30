import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import { ActivityIndicator, Alert, Animated, Easing, KeyboardAvoidingView, Linking, PanResponder, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Logo } from '@/components/logo';
import { FILTER_TINT, RecipeVideo, type VideoFilter } from '@/components/recipe-video';
import { Row } from '@/components/screen';
import { Button, T } from '@/components/ui';
import { TextChip } from '@/components/video-texts';
import { Colors } from '@/constants/theme';
import { keepVideo, pickRecipeVideo } from '@/lib/photos';
import { tr } from '@/lib/i18n';
import { cutsToParam, type Filmed, finishFilming } from '@/lib/recorder';
import { SOUNDS, soundName } from '@/lib/sounds';
import type { VideoText } from '@/lib/types';

const LIMITS = [15, 60, 180];
const FILTERS: { v: VideoFilter; label: string }[] = [{ v: 'none', label: 'None' }, { v: 'beauty', label: 'Beauty' }, { v: 'warm', label: 'Warm' }, { v: 'bright', label: 'Bright' }];
const SPEEDS = [{ v: 0.5, label: 'Slow' }, { v: 1, label: 'Normal' }, { v: 2, label: 'Fast' }];
const speedName = (v: number) => (v < 1 ? 'Slow' : v > 1 ? 'Fast' : '1x');
const mmss = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
const GLASS = 'rgba(255,255,255,0.16)';
const RED = '#FF5A4F';

type Phase = 'ready' | 'countdown' | 'recording' | 'paused' | 'review';
type Icon = 'flip' | 'flash' | 'speed' | 'timer' | 'close' | 'back' | 'trim' | 'upload' | 'pause' | 'play' | 'filter' | 'check' | 'undo' | 'mirror' | 'clips' | 'music' | 'volume' | 'text' | 'cover' | 'split';

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
      {name === 'mirror' && <Path {...p} d="M12 3v18M8 7l-5 5 5 5zM16 7l5 5-5 5z" />}
      {name === 'clips' && <><Rect {...p} x={3} y={6} width={13} height={13} rx={2.5} /><Path {...p} d="M8 3h10.5A2.5 2.5 0 0 1 21 5.5V16" /></>}
      {name === 'undo' && <Path {...p} d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />}
      {name === 'check' && <Path {...p} d="M5 12.5l4.5 4.5L19 7" />}
      {name === 'music' && <><Path {...p} d="M9 18V5l11-2v13" /><Circle {...p} cx={6} cy={18} r={3} /><Circle {...p} cx={17} cy={16} r={3} /></>}
      {name === 'volume' && <Path {...p} d="M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
      {name === 'text' && <Path {...p} d="M5 6V4h14v2M12 4v16M9 20h6" />}
      {name === 'cover' && <><Rect {...p} x={4} y={3} width={16} height={18} rx={3} /><Circle {...p} cx={9.5} cy={9} r={1.8} /><Path {...p} d="M20 16l-5-5-9 9" /></>}
      {name === 'split' && <Path {...p} d="M12 3v18M7 7l-3 5 3 5M17 7l3 5-3 5" />}
    </Svg>
  );
}

/** Snapspoon's own video recorder: a record button to start and stop, tools down the side, then an editor for cuts, sound, words and the cover before posting. */
export default function RecordVideo() {
  const { post } = useLocalSearchParams<{ post?: string }>();
  const [cam, requestCam] = useCameraPermissions();
  const [mic, requestMic] = useMicrophonePermissions();
  const ref = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState(false);
  // Selfie camera shows and saves the real (not mirrored) picture unless Mirror is on.
  const [mirror, setMirror] = useState(false);
  const [timer, setTimer] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [panel, setPanel] = useState<'speed' | 'trim' | 'filter' | null>(null);
  const [filter, setFilter] = useState<VideoFilter>('none');
  const [limit, setLimit] = useState(60);
  const [phase, setPhase] = useState<Phase>('ready');
  const [count, setCount] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Each hold is a clip, in seconds of the file. Deleting a clip skips it on playback.
  const [clips, setClips] = useState<[number, number | null][]>([]);
  const [cuts, setCuts] = useState<[number, number][]>([]);
  const fileSecs = useRef(0);
  const discard = useRef(false);
  const [showClips, setShowClips] = useState(false);
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
      if (video?.music) { params.music = video.music; params.mvol = String(video.mvol ?? 0.8); }
      if (video?.ovol !== undefined && video.ovol !== 1) params.ovol = String(video.ovol);
      if (video?.texts?.length) params.texts = JSON.stringify(video.texts);
      if (video?.cover) params.cover = video.cover;
      router.replace({ pathname: '/write-recipe', params });
    } else router.back();
  };
  const review = (u: string, secs: number) => { if (!secs) { setClips([]); setCuts([]); } setUri(u); setPanel(null); setPhase('review'); };
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
      if (res?.uri) { setUri(res.uri); setPanel(null); setPhase('review'); } else setPhase('ready');
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
    setShowClips(true);
    setPhase('paused');
  };
  // Delete any clip while paused. Deleting the only clip starts over.
  const removeClip = (i: number) => {
    if (phase !== 'paused' || !clips[i]) return;
    const c = clips[i];
    if (clips.length === 1) { discard.current = true; setShowClips(false); ref.current?.stopRecording(); return; }
    setCuts((x) => [...x, [c[0], c[1] ?? fileSecs.current] as [number, number]].sort((a, b) => a[0] - b[0]));
    setClips(clips.filter((_, j) => j !== i));
  };
  const kept = clips.reduce((n, [a, b]) => n + ((b ?? fileSecs.current) - a), 0);
  const pressIn = async () => {
    pressRef.current = { t: Date.now(), was: phase };
    if (phase === 'paused') { setShowClips(false); await ref.current?.toggleRecordingAsync(); setClips((c) => [...c, [fileSecs.current, null]]); setPhase('recording'); return; }
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

  const renderReview = () => (
    <Editor
      uri={uri!} speed={speed} filter={filter} cuts={cuts} post={!!post} saving={saving} speeds={speeds}
      onRetake={() => { setUri(null); setPhase('ready'); }}
      onUse={async (ed) => {
        if (!uri) return;
        setSaving(true);
        const kept = await keepVideo(uri).catch(() => uri);
        const cover = ed.cover ? await keepVideo(ed.cover).catch(() => ed.cover) : undefined;
        next({ uri: kept, speed, filter, ...ed, cover });
      }}
    />
  );

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
          <Row><Logo /><T style={{ fontWeight: '800', fontSize: 18, color: Colors.ink }}>Snapspoon</T></Row>
          <T variant="title">Film your cooking</T>
          <T>Snapspoon needs your camera and microphone to film videos of you making food.</T>
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
        mirror={facing === 'front' && mirror} onCameraReady={() => setReady(true)} onRecordingProgress={(e) => { fileSecs.current = e.duration; setSeconds(e.duration); }} />
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
        {phase === 'paused' && clips.length > 0 && <Tool icon="clips" label="Clips" on={showClips} onPress={() => setShowClips(!showClips)} />}
        {!live && <Tool icon="flip" label="Flip" onPress={() => setFacing(facing === 'back' ? 'front' : 'back')} />}
        {!live && facing === 'front' && <Tool icon="mirror" label="Mirror" on={mirror} onPress={() => setMirror(!mirror)} />}
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
        {phase === 'paused' && showClips && clips.length > 0 && (
          <Row style={{ gap: 10, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 20 }}>
            {clips.map(([a, b], i) => (
              <View key={`${a}`} style={s.clip}>
                <T style={s.clipN}>{i + 1}</T>
                <T style={s.clipLen}>{Math.max(0, (b ?? a) - a).toFixed(1)}s</T>
                <Pressable onPress={() => removeClip(i)} style={s.clipX} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete clip ${i + 1}`}>
                  <Glyph name="close" color={Colors.ink} size={14} />
                </Pressable>
              </View>
            ))}
          </Row>
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

const TEXT_COLORS = ['#FFFFFF', '#FFF3D6', '#4A2E1C', '#E2CEB1', '#FF6B5E', '#FFD54A', '#7ED6A5'];
const VOLS = [0, 0.25, 0.5, 0.75, 1];
type EdTool = 'cut' | 'sound' | 'volume' | 'text' | 'cover' | 'speed';
type EdResult = Pick<Filmed, 'cuts' | 'music' | 'mvol' | 'ovol' | 'texts' | 'cover'>;

/**
 * After filming: split the video and delete any part, add a free sound and set it against your voice,
 * put words on the video and pick the cover. Nothing is re-encoded; the post keeps these choices and every player follows them.
 */
function Editor({ uri, speed, filter, cuts: filmedCuts, post, saving, speeds, onRetake, onUse }: {
  uri: string; speed: number; filter: VideoFilter; cuts: [number, number][]; post: boolean; saving: boolean; speeds: () => React.ReactNode;
  onRetake: () => void; onUse: (r: EdResult) => void;
}) {
  const [tool, setTool] = useState<EdTool | null>(null);
  const [dur, setDur] = useState(0);
  const [bounds, setBounds] = useState<number[]>(() => filmedCuts.flat());
  const [del, setDel] = useState<[number, number][]>(filmedCuts);
  const [sel, setSel] = useState<number | null>(null);
  const [music, setMusic] = useState<string | undefined>();
  const [mvol, setMvol] = useState(0.8);
  const [ovol, setOvol] = useState(1);
  const [texts, setTexts] = useState<VideoText[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [cover, setCover] = useState<string | undefined>();
  const [time, setTime] = useState(0);
  const [seek, setSeek] = useState<{ t: number; n: number } | undefined>();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const timeRef = useRef(0);
  const jump = (t: number) => setSeek((x) => ({ t, n: (x?.n ?? 0) + 1 }));

  // Parts of the video between split points; a part is deleted when its middle is in a deleted range.
  const segs = (() => {
    const b = [...new Set([0, ...bounds.filter((x) => x > 0.05 && x < dur - 0.05), dur])].sort((a, z) => a - z);
    return b.slice(0, -1).map((a, i) => { const e = b[i + 1], m = (a + e) / 2; return { s: a, e, cut: del.some(([x, y]) => m >= x && m <= y) }; });
  })();
  const edCuts = segs.reduce<[number, number][]>((out, g) => {
    if (!g.cut) return out;
    const last = out[out.length - 1];
    if (last && Math.abs(last[1] - g.s) < 0.01) last[1] = g.e; else out.push([g.s, g.e]);
    return out;
  }, []);
  const keptLen = Math.max(0, dur - edCuts.reduce((n, [a, b]) => n + b - a, 0));
  const kept = segs.filter((g) => !g.cut).length;

  // A filmstrip of 8 frames for the timeline and the cover picker. The first frame is the cover until you pick one.
  useEffect(() => {
    if (!dur || thumbs.length) return;
    let off = false;
    (async () => {
      const out: string[] = [];
      for (let i = 0; i < 8; i++) {
        try { out.push((await getThumbnailAsync(uri, { time: Math.round(((i + 0.5) * dur * 1000) / 8), quality: 0.5 })).uri); } catch { /* skip */ }
      }
      if (!off) setThumbs(out);
    })();
    return () => { off = true; };
  }, [dur, uri, thumbs.length]);

  const split = () => {
    const at = Math.round(timeRef.current * 10) / 10;
    if (at < 0.2 || at > dur - 0.2 || bounds.some((x) => Math.abs(x - at) < 0.2)) return Alert.alert(tr('Move to a different spot to split'));
    const nb = [...bounds, at];
    setBounds(nb);
    const b = [...new Set([0, ...nb, dur])].sort((a, z) => a - z);
    setSel(b.findIndex((x, i) => x <= at + 0.01 && b[i + 1] > at + 0.01));
  };
  const delSeg = () => { const g = segs[sel ?? -1]; if (g && kept > 1) { setDel([...del, [g.s, g.e]]); setSel(null); } };
  const restore = () => {
    const g = segs[sel ?? -1];
    if (!g) return;
    const m = (g.s + g.e) / 2;
    setDel(del.flatMap((d) => (m >= d[0] && m <= d[1] ? ([[d[0], g.s], [g.e, d[1]]] as [number, number][]).filter((x) => x[1] - x[0] > 0.05) : [d])));
    setSel(null);
  };
  const frameCover = async () => {
    try { setCover((await getThumbnailAsync(uri, { time: Math.round(timeRef.current * 1000), quality: 0.7 })).uri); } catch { /* keep the old one */ }
  };
  const addText = () => {
    const v = draft.trim();
    if (!v) return;
    if (editing != null) setTexts(texts.map((t, i) => (i === editing ? { ...t, text: v } : t)));
    else { setTexts([...texts, { text: v, x: 50, y: 40, color: '#FFFFFF', style: 'pill', size: 7 }]); setEditing(texts.length); }
  };
  const patchText = (p: Partial<VideoText>) => editing != null && setTexts(texts.map((t, i) => (i === editing ? { ...t, ...p } : t)));
  const pick = (k: EdTool) => { setTool(tool === k ? null : k); if (k !== 'text') setEditing(null); };

  const panel = () => {
    if (tool === 'speed') return speeds();
    if (tool === 'cut') return (
      <View style={s.card}>
        <View style={s.strip} onLayout={(e) => setBox((b) => ({ ...b, w: e.nativeEvent.layout.width }))}>
          {thumbs.length ? thumbs.map((t) => <Image key={t} source={{ uri: t }} style={{ flex: 1 }} contentFit="cover" />) : <View style={{ flex: 1 }} />}
          {dur > 0 && segs.map((g, i) => (
            <Pressable key={`${g.s}-${g.e}`} onPress={() => { setSel(sel === i ? null : i); if (!g.cut) jump(g.s); }} accessibilityLabel={`${tr('Part')} ${i + 1}`}
              style={[s.seg2, { left: `${(g.s / dur) * 100}%`, width: `${((g.e - g.s) / dur) * 100}%` }, i > 0 && { borderLeftWidth: 2 }, g.cut && s.segCut, sel === i && s.segSel]} />
          ))}
          {dur > 0 && <View pointerEvents="none" style={[s.head, { left: `${Math.min(100, (time / dur) * 100)}%` }]} />}
        </View>
        <Row style={{ gap: 8 }}>
          <Pressable onPress={split} style={s.pill}><Glyph name="split" size={18} /><T style={s.cardText}>Split here</T></Pressable>
          {sel != null && segs[sel] ? (segs[sel].cut
            ? <Pressable onPress={restore} style={s.pill}><T style={s.cardText}>Put back</T></Pressable>
            : <Pressable onPress={delSeg} disabled={kept < 2} style={[s.pill, { backgroundColor: 'rgba(255,107,94,0.3)', opacity: kept < 2 ? 0.4 : 1 }]}><T style={s.cardText}>Delete part</T></Pressable>)
            : <T style={s.note}>Tap a part to select it</T>}
        </Row>
      </View>
    );
    if (tool === 'sound') return (
      <View style={[s.card, { maxHeight: 280 }]}>
        <ScrollView contentContainerStyle={{ gap: 6 }}>
          {[{ id: undefined as string | undefined, name: 'No sound' }, ...SOUNDS].map((x) => {
            const on = music === x.id;
            return (
              <Pressable key={x.id ?? 'none'} onPress={() => setMusic(x.id)} style={[s.sound, on && { backgroundColor: Colors.bg }]} accessibilityState={{ selected: on }}>
                <Glyph name={x.id ? 'music' : 'close'} size={16} color={on ? Colors.ink : '#fff'} />
                <View><T style={[s.cardText, on && { color: Colors.ink }]}>{x.name}</T><T style={[s.small, on && { color: Colors.ink }]}>{x.id ? 'Snapspoon beats · free to use' : 'Just your video'}</T></View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
    if (tool === 'volume') return (
      <View style={s.card}>
        {([['Your video', ovol, setOvol, true], ['Music', mvol, setMvol, !!music]] as const).map(([label, v, set, can]) => (
          <View key={label} style={{ gap: 6, opacity: can ? 1 : 0.45 }}>
            <Row style={{ justifyContent: 'space-between' }}><T style={s.cardText}>{label}</T><T style={s.cardText}>{Math.round(v * 100)}</T></Row>
            <View style={s.seg}>
              {VOLS.map((x) => (
                <Pressable key={x} disabled={!can} onPress={() => set(x)} style={[s.segItem, { flex: 1, paddingHorizontal: 0, alignItems: 'center' }, v === x && { backgroundColor: Colors.bg }]}>
                  <T style={[s.segText, v === x && { color: Colors.ink }]}>{x ? `${x * 100}%` : 'Off'}</T>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        {!music && <T style={s.note}>Add a sound to mix it with your voice.</T>}
      </View>
    );
    if (tool === 'text') {
      const t = editing != null ? texts[editing] : undefined;
      return (
        <View style={s.card}>
          <Row style={{ gap: 8, flexWrap: 'nowrap' }}>
            <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={addText} placeholder={tr('Type something')} placeholderTextColor={Colors.muted} maxLength={80} returnKeyType="done" style={s.input} />
            <Pressable onPress={addText} style={[s.pill, { backgroundColor: Colors.bg }]}><T style={[s.cardText, { color: Colors.ink }]}>{t ? 'Done' : 'Add'}</T></Pressable>
          </Row>
          {t && (
            <>
              <Row style={{ gap: 10 }}>
                {TEXT_COLORS.map((c) => <Pressable key={c} onPress={() => patchText({ color: c })} accessibilityLabel="Color" style={[s.color, { backgroundColor: c }, t.color === c && { borderColor: '#fff', borderWidth: 3 }]} />)}
              </Row>
              <Row style={{ gap: 8 }}>
                <Pressable onPress={() => patchText({ style: t.style === 'plain' ? 'pill' : 'plain' })} style={s.pill}><T style={s.cardText}>{t.style === 'plain' ? 'Background' : 'No background'}</T></Pressable>
                <Pressable onPress={() => patchText({ size: Math.max(4, t.size - 1) })} style={s.pill} accessibilityLabel="Smaller"><T style={s.cardText}>A−</T></Pressable>
                <Pressable onPress={() => patchText({ size: Math.min(14, t.size + 1) })} style={s.pill} accessibilityLabel="Bigger"><T style={s.cardText}>A+</T></Pressable>
                <Pressable onPress={() => { setTexts(texts.filter((_, i) => i !== editing)); setEditing(null); setDraft(''); }} style={[s.pill, { backgroundColor: 'rgba(255,107,94,0.3)' }]}><T style={s.cardText}>Delete</T></Pressable>
              </Row>
            </>
          )}
          <T style={s.note}>{texts.length ? 'Drag words to move them. Tap them to change.' : 'Words show on top of your video.'}</T>
        </View>
      );
    }
    if (tool === 'cover') return (
      <View style={s.card}>
        <ScrollView horizontal contentContainerStyle={{ gap: 6 }} showsHorizontalScrollIndicator={false}>
          {thumbs.map((t, i) => {
            const on = (cover ?? thumbs[0]) === t;
            return <Pressable key={t} onPress={() => setCover(t)} accessibilityLabel={`${tr('Frame')} ${i + 1}`}><Image source={{ uri: t }} style={[s.coverThumb, on && { borderColor: Colors.bg, borderWidth: 3 }]} contentFit="cover" /></Pressable>;
          })}
          {!thumbs.length && <ActivityIndicator color="#fff" />}
        </ScrollView>
        <Row style={{ gap: 8 }}>
          <Pressable onPress={frameCover} style={s.pill}><Glyph name="cover" size={18} /><T style={s.cardText}>Use this frame</T></Pressable>
          {cover && !thumbs.includes(cover) && <Image source={{ uri: cover }} style={{ width: 34, height: 60, borderRadius: 6 }} contentFit="cover" />}
        </Row>
        <T style={s.note}>The cover shows on your profile and in search.</T>
      </View>
    );
    return null;
  };

  return (
    <KeyboardAvoidingView style={s.black} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={StyleSheet.absoluteFill} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <RecipeVideo uri={uri} autoPlay controls={false} speed={speed} filter={filter} cuts={edCuts} music={music} mvol={mvol} ovol={ovol} seek={seek}
          onTime={(t) => { timeRef.current = t; setTime(t); }} onDuration={(d) => { if (!dur) setDur(Math.round(d * 10) / 10); }} style={StyleSheet.absoluteFill} />
      </View>
      <Shade />
      {box.w > 0 && texts.map((t, i) => (
        <DragText key={i} t={t} w={box.w} h={box.h} on={editing === i}
          onMove={(x, y) => setTexts((all) => all.map((z, j) => (j === i ? { ...z, x, y } : z)))}
          onTap={() => { setTool('text'); setEditing(i); setDraft(t.text); }} />
      ))}
      <SafeAreaView edges={['top']} style={s.top}>
        <Pressable onPress={onRetake} style={s.round} accessibilityLabel="Retake"><Glyph name="back" /></Pressable>
        <Row style={{ gap: 6 }}><Glyph name="trim" size={18} /><T style={s.timeText}>{mmss(keptLen)}</T></Row>
        <View style={{ width: 42 }} />
      </SafeAreaView>
      <SafeAreaView edges={['top']} style={s.side}>
        <Tool icon="trim" label="Edit" on={tool === 'cut' || edCuts.length > 0} onPress={() => pick('cut')} />
        <Tool icon="music" label={music ? (soundName(music)?.split(' ')[0] ?? 'Sound') : 'Sound'} on={tool === 'sound' || !!music} onPress={() => pick('sound')} />
        <Tool icon="volume" label="Volume" on={tool === 'volume' || ovol !== 1 || (!!music && mvol !== 0.8)} onPress={() => pick('volume')} />
        <Tool icon="text" label="Text" on={tool === 'text' || texts.length > 0} onPress={() => { pick('text'); setEditing(null); setDraft(''); }} />
        <Tool icon="cover" label="Cover" on={tool === 'cover' || !!cover} onPress={() => pick('cover')} />
        <Tool icon="speed" label={speedName(speed)} on={tool === 'speed' || speed !== 1} onPress={() => pick('speed')} />
      </SafeAreaView>
      <SafeAreaView edges={['bottom']} style={s.bottom}>
        {panel()}
        <Row style={{ gap: 12, paddingHorizontal: 20, flexWrap: 'nowrap' }}>
          <Pressable onPress={onRetake} style={[s.big, { backgroundColor: GLASS }]}><T style={s.bigText}>Retake</T></Pressable>
          <Pressable onPress={() => onUse({ cuts: edCuts.length ? edCuts : undefined, music, mvol: music ? mvol : undefined, ovol: ovol !== 1 ? ovol : undefined, texts: texts.length ? texts : undefined, cover: cover ?? thumbs[0] })}
            disabled={saving} style={[s.big, { backgroundColor: Colors.bg, flex: 1.5 }]}>
            {saving ? <ActivityIndicator color={Colors.ink} /> : <T style={[s.bigText, { color: Colors.ink }]}>{post ? 'Next' : 'Use video'}</T>}
          </Pressable>
        </Row>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

/** Words on the video in the editor: drag to move, tap to edit. */
function DragText({ t, w, h, on, onMove, onTap }: { t: VideoText; w: number; h: number; on: boolean; onMove: (x: number, y: number) => void; onTap: () => void }) {
  const cur = useRef(t);
  const onMoveRef = useRef(onMove);
  const onTapRef = useRef(onTap);
  cur.current = t;
  onMoveRef.current = onMove;
  onTapRef.current = onTap;
  const start = useRef({ x: t.x, y: t.y });
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { start.current = { x: cur.current.x, y: cur.current.y }; },
    onPanResponderMove: (_, g) => onMoveRef.current(Math.max(5, Math.min(95, start.current.x + (g.dx / w) * 100)), Math.max(5, Math.min(95, start.current.y + (g.dy / h) * 100))),
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) + Math.abs(g.dy) < 6) onTapRef.current(); },
  })).current;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TextChip t={t} width={w} on={on} handlers={pan.panHandlers} />
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
    <T style={{ color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: -0.3 }}>Snapspoon</T>
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
  clip: { width: 52, height: 76, borderRadius: 12, borderWidth: 2, borderColor: Colors.bg, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  clipN: { color: '#fff', fontWeight: '800', fontSize: 18 },
  clipLen: { color: '#fff', fontWeight: '700', fontSize: 10.5 },
  clipX: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
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
  strip: { height: 64, borderRadius: 10, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#2a1d13' },
  seg2: { position: 'absolute', top: 0, bottom: 0, borderColor: 'rgba(255,255,255,0.9)' },
  segCut: { backgroundColor: 'rgba(18,12,7,0.75)' },
  segSel: { borderWidth: 3, borderColor: Colors.bg, backgroundColor: 'rgba(226,206,177,0.18)' },
  head: { position: 'absolute', top: -3, bottom: -3, width: 3, marginLeft: -1.5, borderRadius: 2, backgroundColor: '#fff' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: GLASS },
  note: { color: 'rgba(255,255,255,0.8)', fontSize: 12.5 },
  small: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  sound: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' },
  input: { flex: 1, minWidth: 0, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, backgroundColor: 'rgba(255,255,255,0.92)', color: Colors.ink },
  color: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  coverThumb: { width: 54, height: 96, borderRadius: 8, backgroundColor: '#2a1d13' },
  bigText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
