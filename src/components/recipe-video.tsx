import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { VideoTexts } from '@/components/video-texts';
import { soundFile } from '@/lib/sounds';
import type { VideoText } from '@/lib/types';

let audioReady = false;

export type VideoFilter = 'none' | 'beauty' | 'warm' | 'bright' | 'mono';
/** Looks are a soft tint over the video, saved with the post and shown wherever it plays. */
export const FILTER_TINT: Record<VideoFilter, string | null> = {
  none: null,
  beauty: 'rgba(255,236,224,0.16)',
  warm: 'rgba(255,170,90,0.14)',
  bright: 'rgba(255,255,255,0.14)',
  mono: null,
};

/** A cooking video. With `autoPlay` it plays muted on a loop, like a reel; `active` pauses it when scrolled away. */
export function RecipeVideo({ uri, style, autoPlay = false, active = true, muted = false, controls = true, speed = 1, trim, cuts, onDuration, filter, music, mvol = 0.8, ovol = 1, texts, onTime, seek, hideTexts }: {
  uri: string; style?: ViewStyle; autoPlay?: boolean; active?: boolean; muted?: boolean; controls?: boolean; speed?: number; trim?: [number, number]; cuts?: [number, number][]; onDuration?: (seconds: number) => void; filter?: VideoFilter;
  /** a Biteboard sound played along with the video, and the two volumes */
  music?: string; mvol?: number; ovol?: number;
  texts?: VideoText[]; hideTexts?: boolean;
  /** the editor follows the play position and jumps the video to a time (change `n` to jump again) */
  onTime?: (seconds: number) => void; seek?: { t: number; n: number };
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
    p.playbackRate = speed;
    p.preservesPitch = false;
  });

  useEffect(() => { player.playbackRate = speed; }, [player, speed]);
  useEffect(() => {
    if (!onDuration) return;
    const sub = player.addListener('statusChange', ({ status }) => { if (status === 'readyToPlay' && player.duration > 0) onDuration(player.duration); });
    return () => sub.remove();
  }, [player, onDuration]);
  // Only play the trimmed part, looping back to its start.
  useEffect(() => {
    if (!trim) return;
    player.timeUpdateEventInterval = 0.1;
    player.currentTime = trim[0];
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      if (currentTime > trim[1] || currentTime < trim[0] - 0.2) player.currentTime = trim[0];
    });
    return () => sub.remove();
  }, [player, trim?.[0], trim?.[1]]);

  // Skip clips that were deleted while filming.
  const cutKey = cuts?.map((c) => c.join('-')).join(',');
  useEffect(() => {
    if (!cuts?.length) return;
    player.timeUpdateEventInterval = 0.1;
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      const c = cuts.find(([a, b]) => currentTime >= a - 0.05 && currentTime < b);
      if (!c) return;
      const end = trim ? trim[1] : player.duration;
      player.currentTime = end && c[1] >= end - 0.1 ? (trim?.[0] ?? 0) : c[1];
    });
    return () => sub.remove();
  }, [player, cutKey, trim?.[0], trim?.[1]]);

  useEffect(() => { player.muted = muted; }, [player, muted]);
  useEffect(() => { player.volume = Math.max(0, Math.min(1, ovol)); }, [player, ovol]);
  useEffect(() => { if (seek) player.currentTime = seek.t; }, [player, seek?.n]);
  useEffect(() => {
    if (!onTime) return;
    player.timeUpdateEventInterval = 0.1;
    const sub = player.addListener('timeUpdate', ({ currentTime }) => onTime(currentTime));
    return () => sub.remove();
  }, [player, onTime]);

  // The sound plays and pauses with the video, starting where the video is.
  const audio = useAudioPlayer(soundFile(music));
  useEffect(() => { audio.loop = true; audio.volume = Math.max(0, Math.min(1, mvol)); audio.muted = muted; }, [audio, mvol, muted]);
  useEffect(() => {
    if (!music) { audio.pause(); return; }
    if (!audioReady) { audioReady = true; setAudioModeAsync({ playsInSilentMode: true }).catch(() => {}); }
    const sync = (playing: boolean) => {
      if (!playing) return audio.pause();
      const d = audio.duration;
      if (d > 0) audio.seekTo(player.currentTime % d).catch(() => {});
      audio.play();
    };
    if (player.playing) sync(true);
    const sub = player.addListener('playingChange', ({ isPlaying }) => sync(isPlaying));
    return () => { sub.remove(); audio.pause(); };
  }, [player, audio, music]);
  useEffect(() => {
    if (autoPlay && active) player.play();
    else player.pause();
  }, [player, autoPlay, active]);

  const tint = filter ? FILTER_TINT[filter] : null;
  const words = !hideTexts && !!texts?.length;
  const video = <VideoView player={player} style={[{ width: '100%', backgroundColor: '#000' }, tint || words ? StyleSheet.absoluteFill : style]} contentFit={autoPlay ? 'cover' : 'contain'} nativeControls={controls} />;
  if (!tint && !words) return video;
  return (
    <View style={[{ width: '100%', overflow: 'hidden' }, style]}>
      {video}
      {tint && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />}
      {words && <VideoTexts texts={texts} />}
    </View>
  );
}
