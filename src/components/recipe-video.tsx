import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';

/** A cooking video. With `autoPlay` it plays muted on a loop, like a reel; `active` pauses it when scrolled away. */
export function RecipeVideo({ uri, style, autoPlay = false, active = true, muted = false, controls = true }: {
  uri: string; style?: ViewStyle; autoPlay?: boolean; active?: boolean; muted?: boolean; controls?: boolean;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
  });

  useEffect(() => { player.muted = muted; }, [player, muted]);
  useEffect(() => {
    if (autoPlay && active) player.play();
    else player.pause();
  }, [player, autoPlay, active]);

  return <VideoView player={player} style={[{ width: '100%', backgroundColor: '#000' }, style]} contentFit={autoPlay ? 'cover' : 'contain'} nativeControls={controls} />;
}
