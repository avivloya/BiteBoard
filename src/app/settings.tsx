import { router } from 'expo-router';
import { Alert, Switch, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Button, Panel, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { usePro } from '@/lib/pro';
import { askPermission, syncReminders } from '@/lib/reminders';
import { aiLeft, useStore } from '@/lib/store';
import type { Reminders } from '@/lib/types';

const ITEMS: { key: keyof Reminders; title: string; sub: string }[] = [
  { key: 'meals', title: 'Meal reminders', sub: 'Breakfast 8:30, lunch 12:30, dinner 6:30' },
  { key: 'streak', title: 'Streak saver', sub: "8pm, only on days you haven't logged" },
  { key: 'weighIn', title: 'Weekly weigh-in', sub: 'Mondays at 8:00' },
];

export default function Settings() {
  const reminders = useStore((s) => s.reminders);
  const setReminders = useStore((s) => s.setReminders);
  const isPro = usePro((s) => s.isPro);

  const toggle = async (key: keyof Reminders, on: boolean) => {
    if (on && !(await askPermission())) {
      return Alert.alert('Notifications are off', 'Turn on notifications for Biteboard in your phone settings to get reminders.');
    }
    setReminders({ ...reminders, [key]: on });
    await syncReminders();
  };

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Settings</T>
      <Panel style={{ backgroundColor: Colors.bg }}>
        <T variant="h3">{isPro ? 'Biteboard Pro' : 'Free plan'}</T>
        <T variant="muted">{isPro ? 'Unlimited photo scans and AI recipes.' : `${aiLeft('scans')} photo scans and ${aiLeft('recipes')} AI recipes left this week.`}</T>
        {!isPro && <Button title="Upgrade to Pro" kind="primary" onPress={() => router.push('/pro')} />}
      </Panel>
      <Panel style={{ backgroundColor: Colors.bg }}>
        <T variant="label">Reminders</T>
        {ITEMS.map((it) => (
          <Row key={it.key} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '600' }}>{it.title}</T>
              <T variant="muted">{it.sub}</T>
            </View>
            <Switch value={reminders[it.key]} onValueChange={(v) => toggle(it.key, v)} trackColor={{ true: Colors.accent, false: Colors.line }} />
          </Row>
        ))}
      </Panel>
      <Button title="Update my profile and plan" onPress={() => router.push({ pathname: '/onboarding', params: { edit: '1' } })} />
    </Screen>
  );
}
