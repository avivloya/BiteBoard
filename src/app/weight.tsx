import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Button, Field, Panel, T } from '@/components/ui';
import { WeightChart } from '@/components/weight-chart';
import { Colors } from '@/constants/theme';
import { kgToLb, lbToKg } from '@/lib/plan';
import { useStore } from '@/lib/store';

export default function WeightScreen() {
  const { weights, profile, logWeight, removeWeight } = useStore();
  const imp = profile?.units === 'imperial';
  const unit = imp ? 'lb' : 'kg';
  const show = (kg: number) => Math.round((imp ? kgToLb(kg) : kg) * 10) / 10;
  const [value, setValue] = useState('');
  const days = Object.keys(weights).sort();
  const points = days.map((day) => ({ day, v: show(weights[day]) }));
  const start = points[0]?.v, latest = points[points.length - 1]?.v;
  const goal = profile ? show(profile.goalKg) : 0;

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Weight</T>
      <Row style={{ flexWrap: 'nowrap' }}>
        {[['Now', latest], ['Change', latest != null && start != null ? Math.round((latest - start) * 10) / 10 : undefined], ['To goal', latest != null ? Math.round((latest - goal) * 10) / 10 : undefined]].map(([l, v]) => (
          <Panel key={l as string} style={{ flex: 1, padding: 12, gap: 2, backgroundColor: Colors.bg }}>
            <T variant="num" style={{ fontSize: 20 }}>{v == null ? '–' : `${l === 'Change' && (v as number) > 0 ? '+' : ''}${v}`}</T>
            <T variant="muted">{l} ({unit})</T>
          </Panel>
        ))}
      </Row>
      <WeightChart points={points.slice(-60)} goal={goal} height={180} />
      <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}><Field label={`Today's weight (${unit})`} value={value} onChangeText={setValue} keyboardType="decimal-pad" /></View>
        <Button title="Log" kind="primary" disabled={!Number(value)} onPress={() => { const v = Number(value); logWeight(imp ? lbToKg(v) : v); setValue(''); }} />
      </Row>
      <View style={{ gap: 6 }}>
        <T variant="label">History</T>
        {[...days].reverse().map((d) => (
          <Row key={d} style={{ justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Colors.line, paddingVertical: 8 }}>
            <T>{d}</T>
            <Row>
              <T variant="num">{show(weights[d])} {unit}</T>
              <Pressable onPress={() => removeWeight(d)} hitSlop={10} accessibilityLabel={`Remove weight for ${d}`}><T variant="muted">Remove</T></Pressable>
            </Row>
          </Row>
        ))}
      </View>
    </Screen>
  );
}
