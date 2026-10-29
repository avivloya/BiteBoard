import { router } from 'expo-router';

import type { VideoFilter } from '@/components/recipe-video';
import type { VideoText } from '@/lib/types';

export type Filmed = {
  uri: string; speed: number; trim?: [number, number]; filter?: VideoFilter; cuts?: [number, number][];
  /** from the editor: a Biteboard sound and the two volumes, words on the video, and the cover frame */
  music?: string; mvol?: number; ovol?: number; texts?: VideoText[]; cover?: string;
};

/** The editor's words travel between screens as JSON; anything that doesn't look right is dropped. */
export const textsFromParam = (s?: string): VideoText[] | undefined => {
  try {
    const t = JSON.parse(s ?? '') as VideoText[];
    return Array.isArray(t) && t.length ? t.filter((x) => typeof x?.text === 'string' && x.text.trim()).slice(0, 10) : undefined;
  } catch { return undefined; }
};

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
