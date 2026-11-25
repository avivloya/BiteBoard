import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform } from 'react-native';

import { Screen } from '@/components/screen';
import { refreshSocial } from '@/components/social';
import { Button, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { appleAvailable, type Provider, signedIn, type SignedIn, signIn, signOut } from '@/lib/auth';
import { restoreBackup, uploadBackup } from '@/lib/backup';
import { socialConfigured, supabase } from '@/lib/social';
import { useSocial } from '@/lib/social-store';
import { useStore } from '@/lib/store';

const NAMES: Record<Provider, string> = { apple: 'Apple', google: 'Google' };

/** Settings › Sign in: save your account with Apple or Google, or get it back on a new phone. */
export default function SignIn() {
  const [state, setState] = useState<SignedIn | null>(null);
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { signedIn().then(setState).catch(() => setState({ provider: null, email: null })); appleAvailable().then(setApple); }, []);

  const go = async (p: Provider) => {
    setBusy(true);
    try {
      const before = (await supabase?.auth.getSession())?.data.session?.user.id;
      const id = await signIn(p);
      if (!id) return;
      await refreshSocial(id);
      // Back on an old account: bring back its food log, weigh-ins and boards. Otherwise back up this phone's.
      const restored = id !== before && (await restoreBackup().catch(() => false));
      if (!restored) await uploadBackup().catch(() => {});
      // Coming back to an old account: bring its name and username onto this phone.
      const me = useSocial.getState().me;
      if (me && !restored) useStore.getState().setAbout({ name: me.name, bio: me.bio, handle: me.handle, photo: me.photo ?? undefined });
      setState(await signedIn());
      Alert.alert('Signed in', restored ? `Welcome back. Your food log, weigh-ins and boards are back on this phone.` : `Your account is saved to ${NAMES[p]}, and your food log and weigh-ins are backed up. Sign in the same way on a new phone to get it all back.`);
      router.back();
    } catch (e) {
      Alert.alert('Could not sign in', e instanceof Error ? e.message : 'Try again.');
    } finally { setBusy(false); }
  };

  const out = () => Alert.alert('Sign out?', "Your posts stay on your account. Sign in again to get back to it.", [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', style: 'destructive', onPress: async () => { setBusy(true); try { const id = await signOut(); await refreshSocial(id); setState(await signedIn()); } catch (e) { Alert.alert('Could not sign out', e instanceof Error ? e.message : ''); } finally { setBusy(false); } } },
  ]);

  if (!socialConfigured) return (
    <Screen edges={[]} bg={Colors.surface}><T variant="h2">Sign in</T><T variant="muted">Sign-in turns on once Supabase is set up. See the launch guide.</T></Screen>
  );

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">{state?.provider ? 'Your account' : 'Save your account'}</T>
      {!state ? <ActivityIndicator color={Colors.ink} /> : state.provider ? (
        <>
          <T>Signed in with {NAMES[state.provider]}{state.email ? ` (${state.email})` : ''}.</T>
          <T variant="muted">Sign in the same way on a new phone to get your profile, posts and followers back.</T>
          <Button title="Sign out" kind="ghost" onPress={out} disabled={busy} />
        </>
      ) : (
        <>
          <T variant="muted">Sign in so you never lose your profile, posts, followers, food log and weigh-ins, even if you change phones. Already have an account? Sign in the same way to get it back.</T>
          {apple && Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={Radius.md}
              style={{ height: 50, opacity: busy ? 0.5 : 1 }}
              onPress={() => !busy && go('apple')}
            />
          )}
          <Button title="Continue with Google" kind="primary" onPress={() => go('google')} disabled={busy} />
          {Platform.OS === 'android' && <Button title="Continue with Apple" onPress={() => go('apple')} disabled={busy} />}
          {busy && <ActivityIndicator color={Colors.ink} />}
        </>
      )}
    </Screen>
  );
}
