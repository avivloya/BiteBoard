import { router } from 'expo-router';

import type { VideoFilter } from '@/components/recipe-video';

export type Filmed = { uri: string; speed: number; trim?: [number, number]; filter?: VideoFilter; cuts?: [number, number][] };

/** Deleted clips travel between screens as "1.5-2.7,4-5". */
export const cutsToParam = (c?: [number, number][]) => (c ?? []).map((x) => x.join('-')).join(',');
export const cutsFromParam = (s?: string): [number, number][] | undefined => {
  const c = (s ?? '').split(',').filter(Boolean).map((x) => x.split('-').map(Number) as [number, number]).filter(([a, b]) => b > a);
  return c.length ? c : undefined;
};

let pending: ((v: Filmed | null) => void) | null = null;

/** Opens the camera to film a cooking video. Resolves with the saved video, or null if the person backs out. */
export function filmVideo(): Promise<Filmed | null> {
  pending?.(null);
  return new Promise((resolve) => {
    pending = resolve;
    router.push('/record-video');
  });
}

/** Opens the camera to start a new post. After filming, it moves on to the caption and recipe details. */
export function startPost() {
  pending?.(null);
  pending = null;
  router.push({ pathname: '/record-video', params: { post: '1' } });
}

/** Called by the camera screen when it closes. Returns false if no one was waiting (a new post). */
export function finishFilming(v: Filmed | null) {
  const waiting = !!pending;
  pending?.(v);
  pending = null;
  return waiting;
}
