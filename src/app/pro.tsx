import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { buy, proConfigured, restore, usePro } from '@/lib/pro';
import { FREE_LIMITS } from '@/lib/store';

const PERKS = [
  ['Unlimited photo scans', `Free plan: ${FREE_LIMITS.scans} a week`],
  ['Unlimited AI recipes', `Free plan: ${FREE_LIMITS.recipes} a week`],
  ['Weight trends', 'Full history and goal chart'],
  ['Support an indie app', 'Helps keep Biteboard growing'],
];

export default function Pro() {
  const { isPro, packages, ready } = usePro();
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);

  const purchase = async () => {
    const pkg = packages[selected];
    if (!pkg) return;
    setBusy(true);
    try {
      if (await buy(pkg)) router.back();
    } catch (e) {
      Alert.alert('Purchase failed', e instanceof Error ? e.message : 'Try again.');
    }
    setBusy(false);
  };

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <View style={{ backgroundColor: Colors.accent, borderRadius: 24, padding: 24, gap: 6 }}>
        <T style={{ color: Colors.accentInk, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>BITEBOARD PRO</T>
        <T style={{ color: Colors.accentInk, fontSize: 30, fontWeight: '800', letterSpacing: -1 }}>{isPro ? "You're Pro. Thank you!" : 'Reach your goal faster'}</T>
      </View>
      <View style={{ gap: 12 }}>
        {PERKS.map(([title, sub]) => (
          <View key={title}>
            <T style={{ fontWeight: '700' }}>✓ {title}</T>
            <T variant="muted">{sub}</T>
          </View>
        ))}
      </View>

      {!proConfigured ? (
        <T variant="muted">Subscriptions aren't set up yet. Add the RevenueCat keys from the README.</T>
      ) : !ready ? (
        <ActivityIndicator color={Colors.accent} />
      ) : isPro ? null : packages.length === 0 ? (
        <T variant="muted">No plans are available right now. Try again later.</T>
      ) : (
        <View style={{ gap: 10 }}>
          {packages.map((p, i) => (
            <Pressable key={p.identifier} onPress={() => setSelected(i)} accessibilityState={{ selected: i === selected }}
              style={{ borderWidth: 1.5, borderColor: i === selected ? Colors.accent : Colors.line, borderRadius: Radius.md, padding: 14, backgroundColor: Colors.bg }}>
              <T style={{ fontWeight: '700' }}>{p.product.title || p.packageType}</T>
              <T variant="muted">{p.product.priceString}{p.packageType === 'ANNUAL' ? ' a year' : p.packageType === 'MONTHLY' ? ' a month' : ''}</T>
            </Pressable>
          ))}
          <Button title={busy ? 'Processing…' : 'Start Pro'} kind="primary" disabled={busy} onPress={purchase} />
        </View>
      )}
      {proConfigured && (
        <Button title="Restore purchases" kind="ghost" onPress={async () => {
          try { Alert.alert((await restore()) ? 'Pro restored' : 'No Pro subscription found on this account'); } catch (e) { Alert.alert('Restore failed', e instanceof Error ? e.message : ''); }
        }} />
      )}
      <T variant="muted" style={{ fontSize: 11 }}>Subscriptions renew automatically until cancelled. Cancel any time in your App Store or Google Play account settings.</T>
    </Screen>
  );
}
