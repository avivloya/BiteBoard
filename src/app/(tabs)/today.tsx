import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { MacroBar, Ring } from '@/components/ring';
import { Row, Screen } from '@/components/screen';
import { Button, Field, Panel, Segmented, T } from '@/components/ui';
import { WeightChart } from '@/components/weight-chart';
import { Colors } from '@/constants/theme';
import { kgToLb } from '@/lib/plan';
import { dayKey, guessMeal, shiftDay } from '@/lib/dates';
import { totals, useStore } from '@/lib/store';
import { streakInfo } from '@/lib/streak';
import { MEALS, type Meal } from '@/lib/types';

export default function Today() {
  const { targets, days, addEntry, removeEntry, setTargets, weights, profile } = useStore();
  const [day, setDay] = useState(dayKey());
  const [adding, setAdding] = useState(false);
  const [editingGoals, setEditingGoals] = useState(false);
  const entries = days[day] ?? [];
  const t = totals(entries);
  const over = t.kcal > targets.kcal;
  const streak = streakInfo(days);
  const label = day === dayKey() ? 'Today' : day === shiftDay(dayKey(), -1) ? 'Yesterday' : day;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="title">{label}</T>
        <Row>
          <Button title="‹" onPress={() => setDay(shiftDay(day, -1))} />
          <Button title="›" disabled={day >= dayKey()} onPress={() => setDay(shiftDay(day, 1))} />
          <Button title="⚙︎" onPress={() => router.push('/settings')} />
        </Row>
      </Row>

      <Panel style={{ alignItems: 'center' }}>
        <Ring value={t.kcal} max={targets.kcal}>
          <T variant="num" style={{ fontSize: 32 }}>{Math.round(Math.abs(targets.kcal - t.kcal))}</T>
          <T variant="muted">{over ? 'kcal over' : 'kcal left'}</T>
          <T variant="num" style={{ fontSize: 11, color: Colors.muted }}>{Math.round(t.kcal)} of {targets.kcal}</T>
        </Ring>
        <View style={{ alignSelf: 'stretch', gap: 10 }}>
          <MacroBar label="Protein" value={t.p} goal={targets.p} color={Colors.protein} />
          <MacroBar label="Carbs" value={t.c} goal={targets.c} color={Colors.carbs} />
          <MacroBar label="Fat" value={t.f} goal={targets.f} color={Colors.fat} />
        </View>
        <Row>
          <Button title="Edit targets" kind="ghost" onPress={() => setEditingGoals((v) => !v)} />
          <Button title="Update my profile" kind="ghost" onPress={() => router.push({ pathname: '/onboarding', params: { edit: '1' } })} />
        </Row>
        {editingGoals && <GoalsForm onSave={(g) => { setTargets(g); setEditingGoals(false); }} />}
      </Panel>

      <Panel>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <T variant="label">Daily streak</T>
            <Row style={{ alignItems: 'baseline' }}>
              <T style={{ fontSize: 44, fontWeight: '800', color: Colors.ink }}>{streak.current}</T>
              <T variant="muted">day{streak.current === 1 ? '' : 's'}</T>
            </Row>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <T variant="muted">Best</T>
            <T variant="num" style={{ fontSize: 18 }}>{streak.best}</T>
          </View>
        </Row>
      </Panel>

      <WeightPanel weights={weights} goalKg={profile?.goalKg ?? 0} imperial={profile?.units === 'imperial'} />

      <Panel>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="h3">Food log</T>
          <Button title={adding ? 'Close' : 'Quick add'} onPress={() => setAdding((v) => !v)} />
        </Row>
        {adding && <QuickAdd onAdd={(e) => { addEntry({ ...e, src: 'manual' }, day); setAdding(false); }} />}
        {entries.length ? MEALS.map((m) => {
          const xs = entries.filter((e) => e.meal === m);
          if (!xs.length) return null;
          return (
            <View key={m} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T variant="muted" style={{ fontWeight: '700' }}>{m}</T>
                <T variant="num">{Math.round(xs.reduce((a, e) => a + e.kcal, 0))} kcal</T>
              </Row>
              {xs.map((e) => (
                <Row key={e.id} style={{ backgroundColor: Colors.surface2, borderRadius: 12, padding: 12, flexWrap: 'nowrap' }}>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontWeight: '600' }} numberOfLines={1}>{e.name}</T>
                    <T variant="num" style={{ fontSize: 12, color: Colors.muted }}>{Math.round(e.kcal)} kcal · {Math.round(e.p)}P {Math.round(e.c)}C {Math.round(e.f)}F</T>
                  </View>
                  <Pressable onPress={() => removeEntry(day, e.id)} hitSlop={10} accessibilityLabel={`Remove ${e.name}`}><T variant="muted">Remove</T></Pressable>
                </Row>
              ))}
            </View>
          );
        }) : <T variant="muted">Nothing logged yet. Snap a photo of your meal, log a recipe from Discover, or quick-add calories.</T>}
      </Panel>
    </Screen>
  );
}

function QuickAdd({ onAdd }: { onAdd: (e: { name: string; kcal: number; p: number; c: number; f: number; meal: Meal }) => void }) {
  const [name, setName] = useState('');
  const [v, setV] = useState({ kcal: '', p: '', c: '', f: '' });
  const [meal, setMeal] = useState<Meal>(guessMeal());
  return (
    <View style={{ gap: 10 }}>
      <Field label="What did you eat?" value={name} onChangeText={setName} placeholder="Coffee with oat milk" />
      <Row style={{ flexWrap: 'nowrap' }}>
        {(['kcal', 'p', 'c', 'f'] as const).map((k) => (
          <View key={k} style={{ flex: 1 }}><Field label={{ kcal: 'kcal', p: 'Protein', c: 'Carbs', f: 'Fat' }[k]} value={v[k]} onChangeText={(x) => setV({ ...v, [k]: x })} keyboardType="number-pad" /></View>
        ))}
      </Row>
      <Segmented value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m, label: m }))} />
      <Button title="Add" kind="primary" disabled={!name.trim() || !Number(v.kcal)} onPress={() => onAdd({ name: name.trim(), kcal: Number(v.kcal), p: Number(v.p) || 0, c: Number(v.c) || 0, f: Number(v.f) || 0, meal })} />
    </View>
  );
}

function GoalsForm({ onSave }: { onSave: (t: { kcal: number; p: number; c: number; f: number }) => void }) {
  const targets = useStore((s) => s.targets);
  const [v, setV] = useState({ kcal: String(targets.kcal), p: String(targets.p), c: String(targets.c), f: String(targets.f) });
  return (
    <View style={{ alignSelf: 'stretch', gap: 10 }}>
      <Row style={{ flexWrap: 'nowrap' }}>
        {(['kcal', 'p', 'c', 'f'] as const).map((k) => (
          <View key={k} style={{ flex: 1 }}><Field label={{ kcal: 'kcal', p: 'Protein g', c: 'Carbs g', f: 'Fat g' }[k]} value={v[k]} onChangeText={(x) => setV({ ...v, [k]: x })} keyboardType="number-pad" /></View>
        ))}
      </Row>
      <Button title="Save targets" kind="primary" onPress={() => onSave({ kcal: Number(v.kcal) || targets.kcal, p: Number(v.p) || 0, c: Number(v.c) || 0, f: Number(v.f) || 0 })} />
    </View>
  );
}

function WeightPanel({ weights, goalKg, imperial }: { weights: Record<string, number>; goalKg: number; imperial: boolean }) {
  const show = (kg: number) => Math.round((imperial ? kgToLb(kg) : kg) * 10) / 10;
  const days = Object.keys(weights).sort();
  const latest = days.length ? show(weights[days[days.length - 1]]) : null;
  return (
    <Pressable onPress={() => router.push('/weight')}>
      <Panel>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="label">Weight</T>
          <T variant="muted">Log weight ›</T>
        </Row>
        <T style={{ fontSize: 28, fontWeight: '800' }}>{latest ?? '–'} <T variant="muted">{imperial ? 'lb' : 'kg'}</T></T>
        <WeightChart points={days.slice(-30).map((d) => ({ day: d, v: show(weights[d]) }))} goal={show(goalKg)} height={100} />
      </Panel>
    </Pressable>
  );
}
