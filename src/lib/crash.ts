import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from './social';

// Crash reports: when the app hits an error it sends a short note to Supabase (Table Editor › app_errors),
// so you hear about problems people never tell you about. No food log, weight or messages are sent.

let last = '';

export async function reportError(error: unknown, opts: { fatal?: boolean; screen?: string } = {}) {
  if (!supabase || __DEV__) return;
  const e = error instanceof Error ? error : new Error(String(error));
  const key = `${e.message}|${opts.screen ?? ''}`;
  if (key === last) return; // the same error over and over only counts once
  last = key;
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  await supabase.from('app_errors').insert({
    user_id: data.session?.user.id ?? null,
    message: e.message.slice(0, 500) || 'Unknown error',
    stack: e.stack?.slice(0, 4000) ?? null,
    screen: opts.screen?.slice(0, 200) ?? null,
    platform: `${Platform.OS} ${Platform.Version}`.slice(0, 40),
    app_version: (Constants.expoConfig?.version ?? '').slice(0, 40),
    fatal: !!opts.fatal,
  }).then(() => {}, () => {});
}

/** Catches errors nothing else caught, reports them, then lets the app handle them as before. */
export function catchCrashes() {
  const g = globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } };
  const eu = g.ErrorUtils;
  if (!eu) return;
  const prev = eu.getGlobalHandler();
  eu.setGlobalHandler((e, fatal) => { reportError(e, { fatal }); prev(e, fatal); });
}
