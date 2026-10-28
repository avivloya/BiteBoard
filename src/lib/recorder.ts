import { router } from 'expo-router';

let pending: ((uri: string | null) => void) | null = null;

/** Opens the camera to film a cooking video. Resolves with the saved video, or null if the person backs out. */
export function filmVideo(): Promise<string | null> {
  pending?.(null);
  return new Promise((resolve) => {
    pending = resolve;
    router.push('/record-video');
  });
}

/** Called by the camera screen when it closes. */
export function finishFilming(uri: string | null) {
  pending?.(uri);
  pending = null;
}
