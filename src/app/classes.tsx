import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Avatar, Verified } from '@/components/social';
import { Button, Field, Panel, Segmented, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { addClass, type CookingClass, listClasses, rsvp } from '@/lib/community';
import { haptic } from '@/lib/haptics';
import { askPermission } from '@/lib/reminders';
import { socialConfigured } from '@/lib/social';
import { useSocial } from '@/lib/social-store';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Live cooking classes from verified chefs. Save a spot to get a reminder; join through the host's live link. */
export default function Classes() {
  const me = useSocial((s) => s.me);
  const [list, setList] = useState<CookingClass[] | null>(null);
  const [error, setError] = useState('');
  const [hosting, setHosting] = useState(false);
  const load = useCallback(() => { listClasses().then(setList).catch((e) => setError(e.message)); }, []);
  useFocusEffect(load);

  if (!socialConfigured) return <Screen edges={[]} bg={Colors.surface}><T variant="h2">Live classes</T><T variant="muted">Live classes need the Snapspoon server.</T></Screen>;

  const save = async (c: CookingClass) => {
    try {
      await rsvp(c.id, !c.mine);
      if (!c.mine && (await askPermission())) {
        const at = new Date(Date.parse(c.starts_at) - 10 * 60_000);
        if (at.getTime() > Date.now()) {
          await Notifications.scheduleNotificationAsync({
            identifier: `class-${c.id}`,
            content: { title: `${c.title} starts in 10 minutes`, body: 'Tap to join the live class.', data: { url: c.link } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
          });
        }
      } else if (c.mine) await Notifications.cancelScheduledNotificationAsync(`class-${c.id}`).catch(() => {});
      haptic.success(); load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Try again.'); }
  };

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Live cooking classes</T>
      <T variant="muted">Cook along live with healthy chefs. Save a spot and we'll remind you 10 minutes before.</T>
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      {!list && !error && <ActivityIndicator color={Colors.accent} />}
      {list && !list.length && <Panel><T variant="muted">No classes scheduled yet. Check back soon.</T></Panel>}
      {list?.map((c) => {
        const live = Date.parse(c.starts_at) <= Date.now() && Date.now() < Date.parse(c.starts_at) + c.minutes * 60_000;
        return (
          <Panel key={c.id} style={{ gap: 6 }}>
            {c.hostProfile && (
              <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id: c.host } })}>
                <Row><Avatar p={c.hostProfile} size={28} /><T style={{ fontWeight: '700' }}>@{c.hostProfile.handle}</T><Verified on={c.hostProfile.verified} /></Row>
              </Pressable>
            )}
            <T variant="h3">{c.title}</T>
            {!!c.about && <T variant="muted">{c.about}</T>}
            <T variant="muted">{live ? '🔴 Live now' : when(c.starts_at)} · {c.minutes} min · {c.going} going</T>
            <Row>
              {live ? <Button title="Join live" kind="primary" onPress={() => WebBrowser.openBrowserAsync(c.link)} />
                : <Button title={c.mine ? 'Spot saved ✓' : 'Save my spot'} kind={c.mine ? 'ghost' : 'primary'} onPress={() => save(c)} />}
            </Row>
          </Panel>
        );
      })}
      {(me?.verified || (me as { chef?: boolean } | null)?.chef) && (hosting ? <HostForm onDone={() => { setHosting(false); load(); }} onError={setError} /> : <Button title="Host a class" onPress={() => setHosting(true)} />)}
    </Screen>
  );
}

function HostForm({ onDone, onError }: { onDone: () => void; onError: (e: string) => void }) {
  const [title, setTitle] = useState('');
  const [about, setAbout] = useState('');
  const [link, setLink] = useState('');
  const [inDays, setInDays] = useState(1);
  const [time, setTime] = useState('18:00');
  const [minutes, setMinutes] = useState(45);
  const go = async () => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(); d.setDate(d.getDate() + inDays); d.setHours(h || 18, m || 0, 0, 0);
    try { await addClass({ title: title.trim(), about: about.trim(), link: link.trim(), minutes, starts_at: d.toISOString() }); onDone(); }
    catch (e) { onError(e instanceof Error ? e.message : 'Try again.'); }
  };
  return (
    <Panel style={{ gap: 10 }}>
      <Field label="Class name" value={title} onChangeText={setTitle} placeholder="20-minute high-protein dinners" />
      <Field label="About" value={about} onChangeText={setAbout} multiline />
      <Field label="Live link (Instagram Live, YouTube, Zoom)" value={link} onChangeText={setLink} autoCapitalize="none" placeholder="https://" />
      <Segmented value={inDays} onChange={setInDays} options={[{ value: 0, label: 'Today' }, { value: 1, label: 'Tomorrow' }, { value: 2, label: 'In 2 days' }, { value: 7, label: 'Next week' }]} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Start time (24h)" value={time} onChangeText={setTime} placeholder="18:00" /></View>
        <View style={{ flex: 1 }}><Field label="Minutes" value={String(minutes)} onChangeText={(v) => setMinutes(Number(v) || 45)} keyboardType="number-pad" /></View>
      </View>
      <Button title="Schedule class" kind="primary" disabled={title.trim().length < 3 || !/^https:\/\//.test(link.trim())} onPress={go} />
    </Panel>
  );
}
