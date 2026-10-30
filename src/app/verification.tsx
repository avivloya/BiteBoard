import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Verified } from '@/components/social';
import { Button, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { buy, usePro } from '@/lib/pro';
import { useSocial } from '@/lib/social-store';
import { VERIFIED_PRICE, VERIFY_RULES } from '@/lib/verification';

const soon = (what: string) => Alert.alert(`${what} is coming soon`, 'This will be added before Snapspoon is in the App Store.');

/** Settings › Verification rules: who can get the badge, how to apply, and how it's kept or lost. */
export default function Verification() {
  const verified = !!useSocial((s) => s.me?.verified);
  const { verifiedPlan, verifiedPackage } = usePro();
  const [busy, setBusy] = useState(false);
  const price = verifiedPackage ? `${verifiedPackage.product.priceString}/month` : VERIFIED_PRICE;
  // Paying starts the ID check; the badge turns on only after Snapspoon checks it.
  const subscribe = async () => {
    if (!verifiedPackage) return soon('The Verified plan');
    setBusy(true);
    try {
      if (await buy(verifiedPackage)) Alert.alert("You're subscribed", "Next we'll check your photo ID. You'll hear back in your Inbox within 7 days.");
    } catch (e) {
      Alert.alert("That didn't go through", e instanceof Error ? e.message : 'Try again in a moment.');
    } finally { setBusy(false); }
  };
  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Verification rules</T>
      <T>{VERIFY_RULES.means}</T>
      {verified && (
        <Row style={{ gap: 8, padding: 12, borderRadius: Radius.md, backgroundColor: Colors.bg }}>
          <Verified on size={18} /><T style={{ fontWeight: '700' }}>Your account is verified.</T>
        </Row>
      )}
      {VERIFY_RULES.sections.map((sec) => (
        <View key={sec.title} style={{ gap: 6 }}>
          <T variant="label">{sec.title}</T>
          {sec.items.map((x) => (
            <Row key={x} style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 8 }}><T>•</T><T style={{ flex: 1 }}>{x}</T></Row>
          ))}
        </View>
      ))}
      <T variant="muted">{VERIFY_RULES.appeal}</T>
      {!verified && verifiedPlan && <T variant="muted">You're on the Verified plan. Your badge turns on once your ID is checked.</T>}
      {!verified && !verifiedPlan && <Button title={`Get Verified · ${price}`} kind="primary" onPress={subscribe} disabled={busy} />}
      {!verified && <Button title="Apply for free" kind="secondary" onPress={() => soon('Free verification requests')} />}
    </Screen>
  );
}
