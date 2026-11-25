import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Button, Field, Panel, Segmented, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { type Challenge, createChallenge, joinChallenge, listChallenges } from '@/lib/community';
import { haptic } from '@/lib/haptics';
import { socialConfigured } from '@/lib/social';

type ChallengeItem = Challenge & { joined: boolean; members: number };

/** Group challenges like "30 days, no soda", with a leaderboard for each. */
export default function Challenges() {
  const [list, setList] = useState<ChallengeItem[] | null>(null);
  const [error, setError] = useState('');
  const [making, setMaking] = useState(false);
  const [title, setTitle] = useState('');
  const [about, setAbout] = useState('');
  const [days, setDays] = useState(30);

  const load = useCallback(() => { listChallenges().then(setList).catch((e) => setError(e.message)); }, []);
  useFocusEffect(load);

  if (!socialConfigured) return <Screen edges={[]} bg={Colors.surface}><T variant="h2">Challenges</T><T variant="muted">Challenges need the Snapspoon server.</T></Screen>;

  const join = async (c: ChallengeItem) => {
    try { await joinChallenge(c.id, !c.joined); haptic.success(); load(); if (!c.joined) router.push({ pathname: '/challenge/[id]', params: { id: c.id } }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Try again.'); }
  };

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Challenges</T>
      <T variant="muted">Join with friends, check in each day, and climb the leaderboard.</T>
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      {!list && !error && <ActivityIndicator color={Colors.accent} />}
      {list?.map((c) => (
        <Pressable key={c.id} onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: c.id } })}>
          <Panel style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <T variant="h3" style={{ flex: 1 }}>{c.title}</T>
              <T variant="muted">{c.days} days</T>
            </Row>
            {!!c.about && <T variant="muted">{c.about}</T>}
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="muted">{c.members} joined</T>
              <Button title={c.joined ? 'Joined ✓' : 'Join'} kind={c.joined ? 'ghost' : 'primary'} onPress={() => join(c)} />
            </Row>
          </Panel>
        </Pressable>
      ))}
      {making ? (
        <Panel style={{ gap: 10 }}>
          <Field label="Name" value={title} onChangeText={setTitle} placeholder="No sweets on weekdays" />
          <Field label="What counts as a check-in?" value={about} onChangeText={setAbout} placeholder="Check in every weekday you skip dessert" />
          <Segmented value={days} onChange={setDays} options={[7, 14, 21, 30].map((d) => ({ value: d, label: `${d} days` }))} />
          <Button title="Start challenge" kind="primary" disabled={title.trim().length < 3} onPress={async () => {
            try { const c = await createChallenge({ title: title.trim(), about: about.trim(), days }); setMaking(false); setTitle(''); setAbout(''); router.push({ pathname: '/challenge/[id]', params: { id: c.id } }); }
            catch (e) { setError(e instanceof Error ? e.message : 'Try again.'); }
          }} />
        </Panel>
      ) : <Button title="Start your own challenge" onPress={() => setMaking(true)} />}
    </Screen>
  );
}
