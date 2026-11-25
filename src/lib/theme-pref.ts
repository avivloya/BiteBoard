import { reloadAppAsync } from 'expo';
import { File, Paths } from 'expo-file-system';

export type ThemePref = 'auto' | 'light' | 'dark';

// Saved in a tiny file so it can be read before the first screen draws (AsyncStorage is too slow for that).
const file = () => new File(Paths.document, 'snapspoon-theme.txt');

export function readThemePref(): ThemePref {
  try {
    const f = file();
    const v = f.exists ? f.textSync().trim() : '';
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

/** Saves the look and restarts the app so every screen redraws in the new colors. */
export async function setThemePref(p: ThemePref) {
  try {
    const f = file();
    if (!f.exists) f.create();
    f.writeSync(p);
  } catch {}
  await reloadAppAsync('Theme changed').catch(() => {});
}
