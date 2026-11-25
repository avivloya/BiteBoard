import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Avatar, Verified } from '@/components/social';
import { Button, Panel, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { type Chef, listChefs } from '@/lib/community';
import { socialConfigured } from '@/lib/social';

/** Healthy chefs and verified creators to follow. */
export default function Chefs() {
  const [list, setList] = useState<Chef[] | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => { if (socialConfigured) listChefs().then(setList).catch((e) => setError(e.message)); }, []));
  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Healthy chefs</T>
      <T variant="muted">Verified cooks, dietitians and creators sharing healthy recipes.</T>
      {!socialConfigured && <T variant="muted">This needs the Snapspoon server.</T>}
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      {socialConfigured && !list && !error && <ActivityIndicator color={Colors.accent} />}
      {list?.map((c) => (
        <Pressable key={c.id} onPress={() => router.push({ pathname: '/person/[id]', params: { id: c.id } })}>
          <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar p={c} size={52} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <T style={{ fontWeight: '800' }}>{c.name}</T><Verified on={c.verified} />
                {c.chef && <T style={{ fontSize: 12, fontWeight: '700', color: Colors.accent }}> · Chef</T>}
              </View>
              <T variant="muted">@{c.handle}{c.specialty ? ` · ${c.specialty}` : ''}</T>
              {!!c.bio && <T variant="muted" numberOfLines={2}>{c.bio}</T>}
            </View>
          </Panel>
        </Pressable>
      ))}
      <Button title="How to become a Snapspoon chef" kind="ghost" onPress={() => router.push('/verification')} />
    </Screen>
  );
}
