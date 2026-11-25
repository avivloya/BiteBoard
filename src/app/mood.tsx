import { Pressable, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Panel, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { dayKey } from '@/lib/dates';
import { useExtras } from '@/lib/extras';
import { haptic } from '@/lib/haptics';
import { moodInsights } from '@/lib/mood';
import { useStore } from '@/lib/store';

const MOODS = ['😣', '😕', '😐', '🙂', '😄'];
const ENERGY = ['🪫', '😴', '🙂', '⚡', '🚀'];

/** How do you feel today? Over time, Snapspoon shows how your food links to your mood and energy. */
export default function Mood() {
  const { moods, set } = useExtras();
  const { days, targets } = useStore();
  const today = moods[dayKey()];
  const pick = (key: 'mood' | 'energy', v: number) => {
    haptic.select();
    set({ moods: { ...moods, [dayKey()]: { mood: today?.mood ?? 3, energy: today?.energy ?? 3, [key]: v } } });
  };
  const insights = moodInsights(moods, days, targets.p, targets.kcal);

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">How are you feeling?</T>
      <Panel style={{ gap: 14 }}>
        <Scale label="Mood" icons={MOODS} value={today?.mood} onPick={(v) => pick('mood', v)} />
        <Scale label="Energy" icons={ENERGY} value={today?.energy} onPick={(v) => pick('energy', v)} />
        {today && <T variant="muted">Saved for today. You can change it any time.</T>}
      </Panel>
      <T variant="label">What we've noticed</T>
      {insights.length ? insights.map((x) => <Panel key={x}><T>{x}</T></Panel>) : (
        <Panel><T variant="muted">Check in for a week and we'll show how protein, calories and logging link to how you feel.</T></Panel>
      )}
    </Screen>
  );
}

function Scale({ label, icons, value, onPick }: { label: string; icons: string[]; value?: number; onPick: (v: number) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <T style={{ fontWeight: '700' }}>{label}</T>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        {icons.map((e, i) => (
          <Pressable key={e} onPress={() => onPick(i + 1)} accessibilityLabel={`${label} ${i + 1} of 5`}
            style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: value === i + 1 ? Colors.accent : Colors.surface2 }}>
            <T style={{ fontSize: 28 }}>{e}</T>
          </Pressable>
        ))}
      </Row>
    </View>
  );
}
