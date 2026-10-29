import { Alert, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Verified } from '@/components/social';
import { Button, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { useSocial } from '@/lib/social-store';
import { VERIFY_RULES } from '@/lib/verification';

/** Settings › Verification rules: who can get the badge, how to apply, and how it's kept or lost. */
export default function Verification() {
  const verified = !!useSocial((s) => s.me?.verified);
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
      {!verified && <Button title="Request verification" onPress={() => Alert.alert('Request verification is coming soon', 'This will be added before Biteboard is in the App Store.')} />}
    </Screen>
  );
}
