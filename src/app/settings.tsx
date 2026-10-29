import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { Alert, Linking, Pressable, Share, Switch, View } from 'react-native';

import { LangPicker } from '@/components/lang-picker';
import { Screen } from '@/components/screen';
import { Segmented, T } from '@/components/ui';
import { PRIVACY_URL, SHARE_URL, SUPPORT_EMAIL, TERMS_URL } from '@/constants/app';
import { Colors, Radius } from '@/constants/theme';
import { proConfigured, restore, usePro } from '@/lib/pro';
import { askPermission, syncReminders } from '@/lib/reminders';
import { deleteAccount, socialConfigured } from '@/lib/social';
import { useSocial } from '@/lib/social-store';
import { aiLeft, useStore } from '@/lib/store';
import type { Reminders } from '@/lib/types';

const REMINDERS: { key: keyof Reminders; title: string; sub: string }[] = [
  { key: 'meals', title: 'Meal reminders', sub: 'Breakfast 8:30, lunch 12:30, dinner 6:30' },
  { key: 'streak', title: 'Streak saver', sub: "8pm, only on days you haven't logged" },
  { key: 'weighIn', title: 'Weekly weigh-in', sub: 'Mondays at 8:00' },
];

const soon = (what: string) => Alert.alert(`${what} is coming soon`, 'This will be added before Biteboard is in the App Store.');
const openUrl = (url: string, what: string) => (url ? WebBrowser.openBrowserAsync(url) : soon(what));

/** Everything an account needs, grouped like a phone's own Settings. */
export default function Settings() {
  const profile = useStore((s) => s.profile);
  const reminders = useStore((s) => s.reminders);
  const { setReminders, setUnits, resetAll } = useStore();
  const isPro = usePro((s) => s.isPro);
  const { userId, me } = useSocial();

  const toggle = async (key: keyof Reminders, on: boolean) => {
    if (on && !(await askPermission())) {
      return Alert.alert('Notifications are off', 'Turn on notifications for Biteboard in your phone settings to get reminders.');
    }
    setReminders({ ...reminders, [key]: on });
    await syncReminders();
  };

  const exportData = () => {
    const { profile: p, targets, boards, mine, days, weights } = useStore.getState();
    Share.share({ title: 'My Biteboard data', message: JSON.stringify({ profile: p, targets, boards, recipes: mine, foodLog: days, weights }, null, 2) });
  };

  const clearPhone = () => Alert.alert('Clear everything on this phone?', 'Your food log, weight, boards and recipes on this phone are erased. Posts on your recipe page stay up.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear', style: 'destructive', onPress: () => { resetAll(); router.replace('/onboarding'); } },
  ]);

  const removeAccount = () => Alert.alert('Delete your account?', 'This removes your recipe page, posts, videos, followers and everything on this phone. It cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete account', style: 'destructive', onPress: async () => {
      try {
        if (userId) await deleteAccount(userId);
        useSocial.getState().set({ userId: null, me: null, friendIds: [], people: {}, feed: [], forYou: [] });
        resetAll();
        router.replace('/onboarding');
      } catch (e) {
        Alert.alert('Could not delete your account', e instanceof Error ? e.message : 'Check your connection and try again.');
      }
    } },
  ]);

  const version = Constants.expoConfig?.version ?? '';

  return (
    <Screen edges={[]} bg={Colors.surface} style={{ gap: 22 }}>
      <T variant="h2">Settings</T>

      <Section title="Account">
        <Item title="Edit profile" sub={me ? 'Picture, name, handle and bio' : 'Name and bio'} onPress={() => router.push('/edit-profile')} />
        <Item title="Personal info and goals" sub={profile ? `${profile.name}${profile.email ? ` · ${profile.email}` : ''}` : undefined} onPress={() => router.push({ pathname: '/onboarding', params: { edit: '1' } })} />
        <Item title="Weight" sub="Log and see your trend" onPress={() => router.push('/weight')} />
        <View style={{ padding: 14, gap: 8 }}>
          <T style={{ fontWeight: '600' }}>Language</T>
          <LangPicker />
        </View>
        <View style={{ padding: 14, gap: 8 }}>
          <T style={{ fontWeight: '600' }}>Units</T>
          <Segmented value={profile?.units ?? 'metric'} onChange={setUnits} options={[{ value: 'metric', label: 'kg, cm' }, { value: 'imperial', label: 'lb, ft' }]} />
        </View>
      </Section>

      <Section title="Subscription">
        <Item title={isPro ? 'Biteboard Pro' : 'Free plan'} sub={isPro ? 'Unlimited photo scans and AI recipes' : `${aiLeft('scans')} photo scans and ${aiLeft('recipes')} AI recipes left this week`}
          onPress={isPro ? undefined : () => router.push('/pro')} action={isPro ? undefined : 'Upgrade'} />
        {proConfigured && <Item title="Restore purchases" onPress={async () => {
          const ok = await restore().catch(() => false);
          Alert.alert(ok ? 'Pro restored' : 'Nothing to restore', ok ? 'Welcome back to Biteboard Pro.' : 'We couldn’t find a Pro subscription on this account.');
        }} />}
      </Section>

      <Section title="Notifications">
        {REMINDERS.map((it) => (
          <Item key={it.key} title={it.title} sub={it.sub}
            right={<Switch value={reminders[it.key]} onValueChange={(v) => toggle(it.key, v)} trackColor={{ true: Colors.accent, false: Colors.line }} />} />
        ))}
      </Section>

      <Section title="Privacy">
        <View style={{ padding: 14 }}>
          <T variant="muted">Your recipe page, posts, videos and who you follow are public. Your weight, food log and goals stay private on this phone.</T>
        </View>
        <Item title="Privacy policy" onPress={() => openUrl(PRIVACY_URL, 'The privacy policy')} />
        <Item title="Terms of use" onPress={() => openUrl(TERMS_URL, 'The terms of use')} />
      </Section>

      <Section title="Help">
        <Item title="Contact support" onPress={() => (SUPPORT_EMAIL ? Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Biteboard help`) : soon('Support email'))} />
        <Item title="Share Biteboard" onPress={() => Share.share({ message: `I'm using Biteboard to cook healthy and track calories.${SHARE_URL ? ` ${SHARE_URL}` : ''}` })} />
      </Section>

      <Section title="Your data">
        <Item title="Export my data" sub="Your food log, weight, recipes and boards" onPress={exportData} />
        <Item title="Clear data on this phone" onPress={clearPhone} danger />
        <Item title="Delete account" onPress={removeAccount} danger />
      </Section>

      <T variant="muted" style={{ textAlign: 'center', fontSize: 12 }}>Biteboard {version}</T>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <T variant="label" style={{ marginLeft: 4 }}>{title}</T>
      <View style={{ backgroundColor: Colors.bg, borderRadius: Radius.lg, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

function Item({ title, sub, onPress, right, action, danger }: { title: string; sub?: string; onPress?: () => void; right?: ReactNode; action?: string; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(207,181,146,0.35)', opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontWeight: '600', color: danger ? Colors.warn : Colors.ink }}>{title}</T>
        {!!sub && <T variant="muted" style={{ fontSize: 13 }} numberOfLines={2}>{sub}</T>}
      </View>
      {right ?? (onPress && <T variant="muted" style={{ fontWeight: action ? '700' : '400', color: action ? Colors.accent : Colors.muted }}>{action ?? '›'}</T>)}
    </Pressable>
  );
}
