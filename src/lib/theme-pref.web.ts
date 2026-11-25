export type ThemePref = 'auto' | 'light' | 'dark';
const KEY = 'snapspoon:theme';

export function readThemePref(): ThemePref {
  try {
    const v = globalThis.localStorage?.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export async function setThemePref(p: ThemePref) {
  try { globalThis.localStorage?.setItem(KEY, p); } catch {}
  globalThis.location?.reload();
}
