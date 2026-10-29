import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';

/** A cooking video. With `autoPlay` it plays muted on a loop, like a reel; `active` pauses it when scrolled away. */
export function RecipeVideo({ uri, style, autoPlay = false, active = true, muted = false, controls = true, speed = 1, trim, onDuration }: {
  uri: string; style?: ViewStyle; autoPlay?: boolean; active?: boolean; muted?: boolean; controls?: boolean; speed?: number; trim?: [number, number]; onDuration?: (seconds: number) => void;
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

  useEffect(() => { player.muted = muted; }, [player, muted]);
  useEffect(() => {
    if (autoPlay && active) player.play();
    else player.pause();
  }, [player, autoPlay, active]);

  return <VideoView player={player} style={[{ width: '100%', backgroundColor: '#000' }, style]} contentFit={autoPlay ? 'cover' : 'contain'} nativeControls={controls} />;
}
