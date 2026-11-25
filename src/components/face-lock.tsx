import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useExtras } from '@/lib/extras';
import { Logo } from './logo';
import { Button, T } from './ui';

/** Can this phone lock the app with Face ID, Touch ID or a fingerprint? */
export async function canFaceLock() {
  if (Platform.OS === 'web') return false;
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

export async function biometricName() {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync().catch(() => [] as LocalAuthentication.AuthenticationType[]);
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return Platform.OS === 'ios' ? 'Face ID' : 'Face unlock';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
  return 'Passcode';
}

export const unlock = async () =>
  (await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Snapspoon', fallbackLabel: 'Use passcode' })).success;

/** Covers the app until you unlock it, when the lock is on. Locks again after a minute in the background. */
export function FaceLock() {
  const on = useExtras((s) => s.faceLock);
  const [locked, setLocked] = useState(false);
  const away = useRef(0);
  const tryUnlock = useCallback(async () => { if (await unlock().catch(() => false)) setLocked(false); }, []);

  // Lock at launch once the saved setting has loaded (turning it on in Settings doesn't lock you out).
  useEffect(() => {
    const atLaunch = () => { if (useExtras.getState().faceLock) { setLocked(true); tryUnlock(); } };
    if (useExtras.persist.hasHydrated()) atLaunch();
    else return useExtras.persist.onFinishHydration(atLaunch);
  }, [tryUnlock]);

  useEffect(() => {
    if (!on) return setLocked(false);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background') away.current = Date.now();
      if (st === 'active' && away.current && Date.now() - away.current > 60_000) { away.current = 0; setLocked(true); tryUnlock(); }
    });
    return () => sub.remove();
  }, [on, tryUnlock]);

  if (!on || !locked) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 32 }]}>
      <Logo size={72} />
      <T variant="h2">Snapspoon is locked</T>
      <Button title="Unlock" kind="primary" onPress={tryUnlock} />
    </View>
  );
}
