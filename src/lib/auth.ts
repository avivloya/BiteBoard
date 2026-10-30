import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { ensureSession, supabase } from './social';

// Everyone starts with a quiet guest account (no password). Signing in with Apple or Google saves that same
// account, so the profile, posts and followers come back on a new phone. Supabase needs the Apple and Google
// providers turned on (see the launch guide).

export type Provider = 'apple' | 'google';
export type SignedIn = { provider: Provider | null; email: string | null };

function client() {
  if (!supabase) throw new Error('Signing in needs Supabase. See the launch guide.');
  return supabase;
}

/** How you're signed in right now: null provider means a guest account. */
export async function signedIn(): Promise<SignedIn> {
  if (!supabase) return { provider: null, email: null };
  const { data } = await supabase.auth.getUser();
  const ids = data.user?.identities ?? [];
  const p = ids.find((i) => i.provider === 'apple') ? 'apple' : ids.find((i) => i.provider === 'google') ? 'google' : null;
  return { provider: data.user?.is_anonymous ? null : p, email: data.user?.email ?? null };
}

export const appleAvailable = () => (Platform.OS === 'ios' ? AppleAuthentication.isAvailableAsync() : Promise.resolve(false));

const taken = (e: { message?: string; code?: string } | null) => !!e && (e.code === 'identity_already_exists' || /already (been )?linked|already exists/i.test(e.message ?? ''));

/**
 * Signs in. A guest keeps their account and it's saved to Apple or Google. If that Apple or Google login already
 * has a Snapspoon account (say, from an old phone), you switch to it instead. Returns the user id, or null if cancelled.
 */
export async function signIn(provider: Provider): Promise<string | null> {
  const db = client();
  await ensureSession();
  const { data: cur } = await db.auth.getUser();
  const guest = !!cur.user?.is_anonymous;

  if (provider === 'apple' && Platform.OS === 'ios') {
    const raw = Crypto.randomUUID();
    const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
    let cred: AppleAuthentication.AppleAuthenticationCredential;
    try {
      cred = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL], nonce });
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
      throw e;
    }
    if (!cred.identityToken) throw new Error('Apple did not send a sign-in. Try again.');
    const token = { provider: 'apple' as const, token: cred.identityToken, nonce: raw };
    if (guest) {
      // Linking keeps the guest's user id, so everything they made stays theirs.
      const { error } = await db.auth.linkIdentity(token);
      if (!error) return cur.user!.id;
      if (!taken(error)) throw new Error(error.message);
    }
    const { data, error } = await db.auth.signInWithIdToken(token);
    if (error) throw new Error(error.message);
    return data.user?.id ?? null;
  }

  // Google (and Apple on Android) open a secure browser page, then come back to the app.
  const redirectTo = Linking.createURL('auth');
  type Done = { id: string | null } | { error: { code: string; message: string } } | null;
  const browser = async (link: boolean): Promise<Done> => {
    const opts = { provider, options: { redirectTo, skipBrowserRedirect: true } } as const;
    const { data, error } = link ? await db.auth.linkIdentity(opts) : await db.auth.signInWithOAuth(opts);
    if (error || !data.url) throw new Error(error?.message ?? 'Could not open the sign-in page.');
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type !== 'success') return null;
    const u = new URL(res.url.replace('#', res.url.includes('?') ? '&' : '?'));
    const err = u.searchParams.get('error_code') ?? u.searchParams.get('error');
    if (err) return { error: { code: err, message: u.searchParams.get('error_description') ?? err } };
    const code = u.searchParams.get('code');
    const access = u.searchParams.get('access_token'), refresh = u.searchParams.get('refresh_token');
    const s = code ? await db.auth.exchangeCodeForSession(code) : access && refresh ? await db.auth.setSession({ access_token: access, refresh_token: refresh }) : null;
    if (!s) throw new Error('Sign-in did not finish. Try again.');
    if (s.error) throw new Error(s.error.message);
    return { id: s.data.user?.id ?? null };
  };
  let r = await browser(guest);
  if (r && 'error' in r && guest && taken(r.error)) r = await browser(false);
  if (r && 'error' in r) throw new Error(r.error.message);
  return r?.id ?? null;
}

/** Signs out of this phone. You get a fresh guest account; sign in again to get yours back. */
export async function signOut() {
  await client().auth.signOut();
  return ensureSession();
}
