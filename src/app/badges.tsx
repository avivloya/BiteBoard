import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row, Screen } from '@/components/screen';
import { Button, Panel, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useExtras } from '@/lib/extras';
import { useStore } from '@/lib/store';
import { myXp } from '@/lib/xp';

/** Your level, XP, streak freezes and badges. */
export default function Badges() {
  useStore((s) => s.days);
  useExtras((s) => s.freezes);
  const x = myXp();
  const pct = Math.min(1, x.intoLevel / x.levelSize);
  const done = x.badges.filter((b) => b.done).length;
  return (
    <Screen edges={[]} bg={Colors.surface}>
      <Panel style={{ gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="h2">Level {x.level}</T>
          <T variant="num">{x.xp} XP</T>
        </Row>
        <View style={{ height: 10, backgroundColor: Colors.surface2, borderRadius: 5, overflow: 'hidden' }}>
          <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: Colors.accent, borderRadius: 5 }} />
        </View>
        <T variant="muted">{x.levelSize - x.intoLevel} XP to level {x.level + 1}. You get XP for every meal, day, weigh-in, recipe and photo.</T>
      </Panel>
      <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <T style={{ fontSize: 34 }}>🧊</T>
        <View style={{ flex: 1 }}>
          <T variant="h3">{x.freezes} streak freeze{x.freezes === 1 ? '' : 's'}</T>
          <T variant="muted">If you miss a day, a freeze keeps your streak going. Earn one for every 7 days in a row (you can hold 2).</T>
        </View>
      </Panel>
      <T variant="label">Badges · {done} of {x.badges.length}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {x.badges.map((b, i) => (
          <Animated.View key={b.id} entering={FadeInDown.delay(i * 30)} style={{ width: '31%' }}>
            <Panel style={{ alignItems: 'center', gap: 4, padding: 12, opacity: b.done ? 1 : 0.45 }}>
              <T style={{ fontSize: 34 }}>{b.done ? b.emoji : '🔒'}</T>
              <T style={{ fontWeight: '700', fontSize: 13, textAlign: 'center' }}>{b.title}</T>
              <T variant="muted" style={{ fontSize: 11, textAlign: 'center' }}>{b.how}</T>
            </Panel>
          </Animated.View>
        ))}
      </View>
      <Button title="See my Wrapped" onPress={() => router.push('/wrapped')} />
    </Screen>
  );
}
