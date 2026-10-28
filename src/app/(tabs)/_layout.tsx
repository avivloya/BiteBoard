import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { Colors } from '@/constants/theme';
import { useStore } from '@/lib/store';

/** Three tabs: watch or discover, track calories, your account. */
export default function TabsLayout() {
  const profile = useStore((s) => s.profile);
  if (!profile) return <Redirect href="/onboarding" />;

  return (
    <NativeTabs backgroundColor={Colors.surface} indicatorColor={Colors.surface2} labelStyle={{ selected: { color: Colors.ink } }} tintColor={Colors.accent}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'play.rectangle', selected: 'play.rectangle.fill' }} md="smart_display" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Label>Tracker</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'flame', selected: 'flame.fill' }} md="local_fire_department" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
