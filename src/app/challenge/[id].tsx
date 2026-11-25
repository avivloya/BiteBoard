import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Share, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Avatar } from '@/components/social';
import { Button, Panel, T } from '@/components/ui';
import { SHARE_URL } from '@/constants/app';
import { Colors } from '@/constants/theme';
import { celebrate } from '@/lib/celebrate';
import { checkIn, highFive, joinChallenge, leaderboard, type Challenge, type Standing } from '@/lib/community';
import { haptic } from '@/lib/haptics';

/** One challenge: check in for today and see the leaderboard. Give friends a high five. */
export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<{ challenge: Challenge; standings: Standing[]; me: string } | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { leaderboard(id).then(setData).catch((e) => setError(e.message)); }, [id]);
  useFocusEffect(load);

  if (!data) return <Screen edges={[]} bg={Colors.surface}>{error ? <T style={{ color: Colors.warn }}>{error}</T> : <ActivityIndicator color={Colors.accent} />}</Screen>;
  const { challenge: c, standings, me } = data;
  const mine = standings.find((s) => s.user.id === me);
  const daysIn = Math.min(c.days, Math.floor((Date.now() - Date.parse(c.starts_on)) / 86_400_000) + 1);

  const toggle = async () => {
    try {
      if (!mine) await joinChallenge(c.id, true);
      await checkIn(c.id, !mine?.today);
      if (!mine?.today) { haptic.success(); celebrate('Checked in ✓', `${(mine?.checkins ?? 0) + 1} of ${c.days} days`); }
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Try again.'); }
  };

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">{c.title}</T>
      {!!c.about && <T variant="muted">{c.about}</T>}
      <T variant="muted">Day {Math.max(1, daysIn)} of {c.days} · {standings.length} taking part</T>
      <Button title={!mine ? 'Join and check in today' : mine.today ? 'Checked in today ✓' : 'Check in for today'} kind={mine?.today ? 'secondary' : 'primary'} onPress={toggle} />
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      <T variant="label">Leaderboard</T>
      {standings.map((s, i) => (
        <Panel key={s.user.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: s.user.id === me ? 2 : 0, borderColor: Colors.accent }}>
          <T style={{ width: 28, fontWeight: '900', fontSize: 18, color: Colors.muted }}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</T>
          <Avatar p={s.user} size={36} />
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '700' }} numberOfLines={1}>{s.user.name}</T>
            <T variant="muted">{s.checkins} day{s.checkins === 1 ? '' : 's'}{s.today ? ' · in today' : ''}</T>
          </View>
          {s.user.id !== me && <Button title="🙌" kind="ghost" onPress={() => highFive(s.user.id).then(() => { haptic.success(); Alert.alert('High five sent', `@${s.user.handle} will see it in their messages.`); }).catch((e) => Alert.alert('Could not send', e.message))} />}
        </Panel>
      ))}
      <Row>
        <Button title="Invite friends" onPress={() => Share.share({ message: `Join my "${c.title}" challenge on Snapspoon!${SHARE_URL ? ` ${SHARE_URL}` : ''}` })} />
        {mine && <Button title="Leave" kind="ghost" onPress={() => joinChallenge(c.id, false).then(load)} />}
      </Row>
    </Screen>
  );
}
