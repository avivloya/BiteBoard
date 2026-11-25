import { Linking, Platform, Share, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Button, Panel, T } from '@/components/ui';
import { Colors } from '@/constants/theme';

const LINKS = [
  { say: 'Log my breakfast', url: 'snapspoon://voice-log', what: 'Opens voice logging' },
  { say: 'Snap my meal', url: 'snapspoon://live-snap', what: 'Opens the live calorie camera' },
  { say: 'How many calories left', url: 'snapspoon://today', what: 'Opens your tracker' },
  { say: 'What should I eat', url: 'snapspoon://coach', what: 'Asks Bitey for meal ideas' },
];

/** How to talk to Snapspoon with Siri or Google Assistant. */
export default function Shortcuts() {
  const ios = Platform.OS === 'ios';
  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">{ios ? 'Siri shortcuts' : 'Assistant shortcuts'}</T>
      {ios ? (
        <T variant="muted">Open the Shortcuts app, tap +, add the “Open URL” action and paste one of the links below. Name the shortcut with the phrase you want to say, then say “Hey Siri, {LINKS[0].say.toLowerCase()}”.</T>
      ) : (
        <T variant="muted">Long-press the Snapspoon icon to see these shortcuts, and drag one to your home screen. You can also say “Hey Google, open Snapspoon” and then tap a shortcut, or add a link below as a Google Assistant routine.</T>
      )}
      {LINKS.map((l) => (
        <Panel key={l.url} style={{ gap: 4 }}>
          <T style={{ fontWeight: '700' }}>“{l.say}”</T>
          <T variant="muted">{l.what}</T>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="num" selectable>{l.url}</T>
            <Button title="Share link" kind="ghost" onPress={() => Share.share({ message: l.url })} />
          </Row>
        </Panel>
      ))}
      {ios && (
        <View style={{ alignItems: 'flex-start' }}>
          <Button title="Open the Shortcuts app" kind="primary" onPress={() => Linking.openURL('shortcuts://create-shortcut').catch(() => {})} />
        </View>
      )}
    </Screen>
  );
}
