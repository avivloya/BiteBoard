import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BiteyAvatar } from '@/components/bitey-avatar';
import { MealResult } from '@/components/meal-result';
import { MacroBar, Ring } from '@/components/ring';
import { Row, Screen } from '@/components/screen';
import { Button, Field, Panel, Segmented, T } from '@/components/ui';
import { WeightChart } from '@/components/weight-chart';
import { Colors } from '@/constants/theme';
import { type MealEstimate, aiConfigured, estimateText } from '@/lib/ai';
import { useExtras } from '@/lib/extras';
import { goalDate, niceDate } from '@/lib/goal-date';
import { KCAL_FLOOR, kgToLb } from '@/lib/plan';
import { dayKey, guessMeal, shiftDay } from '@/lib/dates';
import { totals, useStore } from '@/lib/store';
import { streakInfo } from '@/lib/streak';
import { useVoice } from '@/lib/voice';
import { myXp } from '@/lib/xp';
import { MEALS, type Meal } from '@/lib/types';

export default function Today() {
  const { targets, days, addEntry, removeEntry, setTargets, weights, profile, water, addWater } = useStore();
  const [day, setDay] = useState(dayKey());
  const [adding, setAdding] = useState(false);
  const [editingGoals, setEditingGoals] = useState(false);
  const entries = days[day] ?? [];
  const t = totals(entries);
  const over = t.kcal > targets.kcal;
  const streak = streakInfo(days);
  const moodToday = useExtras((x) => !!x.moods[dayKey()]);
  const label = day === dayKey() ? 'Today' : day === shiftDay(dayKey(), -1) ? 'Yesterday' : day;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <T variant="title">{label}</T>
          <Pressable onPress={() => router.push('/badges')} hitSlop={6}>
            <T variant="muted">🔥 {streak.current} day streak{streak.best > streak.current ? ` · best ${streak.best}` : ''} · Level {myXp().level} ›</T>
          </Pressable>
        </View>
        <Row>
          <Button title="‹" onPress={() => setDay(shiftDay(day, -1))} />
          <Button title="›" disabled={day >= dayKey()} onPress={() => setDay(shiftDay(day, 1))} />
        </Row>
      </Row>

      <Row style={{ flexWrap: 'nowrap' }}>
        <Button title="Snap meal" kind="primary" style={{ flex: 1.3 }} onPress={() => router.push('/snap')} />
        <Button title="Barcode" style={{ flex: 1 }} onPress={() => router.push('/scan')} />
        <Button title={adding ? 'Close' : 'Add'} style={{ flex: 1 }} onPress={() => setAdding((v) => !v)} />
      </Row>
      <Row style={{ flexWrap: 'nowrap' }}>
        <Button title="Live scan" style={{ flex: 1 }} onPress={() => router.push('/live-snap')} />
        <Button title="Voice" style={{ flex: 1 }} onPress={() => router.push('/voice-log')} />
        <Button title="More ✦" style={{ flex: 1 }} onPress={() => router.push('/more')} />
      </Row>
      {adding && <Panel><QuickAdd onAdd={(e) => { addEntry({ ...e, src: 'manual' }, day); setAdding(false); }} /></Panel>}

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

      {day === dayKey() && !moodToday && new Date().getHours() >= 16 && (
        <Pressable onPress={() => router.push('/mood')} accessibilityRole="button">
          <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <T style={{ fontSize: 30 }}>🙂</T>
            <View style={{ flex: 1 }}>
              <T variant="h3">How do you feel today?</T>
              <T variant="muted">A 2-second check-in shows how food affects your mood and energy</T>
            </View>
            <T variant="muted">›</T>
          </Panel>
        </Pressable>
      )}

      {day === dayKey() && (
        <Pressable onPress={() => router.push('/coach')} accessibilityRole="button">
          <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <BiteyAvatar size={40} />
            <View style={{ flex: 1 }}>
              <T variant="h3">What should I eat next?</T>
              <T variant="muted">Ideas that fit your {Math.round(Math.max(0, targets.kcal - t.kcal))} kcal left</T>
            </View>
            <T variant="muted">›</T>
          </Panel>
        </Pressable>
      )}

      <WaterPanel glasses={water?.[day] ?? 0} onAdd={(n) => addWater(n, day)} />

      <WeekPanel days={days} weights={weights} target={targets.kcal} imperial={profile?.units === 'imperial'} />

      <WeightPanel weights={weights} goalKg={profile?.goalKg ?? 0} imperial={profile?.units === 'imperial'} />

      <Panel>
        <T variant="h3">Food log</T>
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
        }) : <T variant="muted">Nothing logged yet. Snap a photo of your meal, log a recipe from Explore, or quick-add calories.</T>}
      </Panel>
    </Screen>
  );
}

/** Quick add: the mic opens straight away. Say what you ate and AI turns it into foods with calories; or type the numbers. */
function QuickAdd({ onAdd }: { onAdd: (e: { name: string; kcal: number; p: number; c: number; f: number; meal: Meal }) => void }) {
  const [name, setName] = useState('');
  const [v, setV] = useState({ kcal: '', p: '', c: '', f: '' });
  const [meal, setMeal] = useState<Meal>(guessMeal());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MealEstimate | null>(null);
  const estimate = async (what: string) => {
    if (!what.trim() || !aiConfigured) return;
    setBusy(true); setError('');
    try { setResult(await estimateText(what)); } catch (e) { setError(e instanceof Error ? e.message : 'That did not work. Try again.'); }
    setBusy(false);
  };
  const voice = useVoice({ onFinal: estimate });
  useEffect(() => { if (aiConfigured) voice.start(); return () => voice.stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (result) {
    return (
      <MealResult result={result} onChange={setResult} onReset={() => { setResult(null); voice.setText(''); }}
        onAdd={(n, sum, m) => onAdd({ name: n, kcal: Math.round(sum.kcal), p: Math.round(sum.p), c: Math.round(sum.c), f: Math.round(sum.f), meal: m })} />
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {aiConfigured && (
        <View style={{ gap: 8 }}>
          <Row style={{ flexWrap: 'nowrap' }}>
            <Pressable onPress={voice.listening ? voice.stop : voice.start} accessibilityRole="button" accessibilityLabel={voice.listening ? 'Stop listening' : 'Talk to log a meal'}
              style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: voice.listening ? Colors.warn : Colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ fontSize: 24 }}>🎙️</T>
            </Pressable>
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '700' }}>{busy ? 'Working it out…' : voice.listening ? 'Listening… say what you ate' : 'Tap the mic and say what you ate'}</T>
              <T variant="muted" numberOfLines={3}>{voice.text || 'Like “two eggs on toast and a latte”'}</T>
            </View>
            {busy && <ActivityIndicator color={Colors.accent} />}
          </Row>
          {!!(error || voice.error) && <T style={{ color: Colors.warn }}>{error || voice.error}</T>}
          <T variant="label">Or type the numbers</T>
        </View>
      )}
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
  const [low, setLow] = useState(false);
  return (
    <View style={{ alignSelf: 'stretch', gap: 10 }}>
      <Row style={{ flexWrap: 'nowrap' }}>
        {(['kcal', 'p', 'c', 'f'] as const).map((k) => (
          <View key={k} style={{ flex: 1 }}><Field label={{ kcal: 'kcal', p: 'Protein g', c: 'Carbs g', f: 'Fat g' }[k]} value={v[k]} onChangeText={(x) => setV({ ...v, [k]: x })} keyboardType="number-pad" /></View>
        ))}
      </Row>
      {low && <T style={{ color: Colors.warn }}>Eating less than {KCAL_FLOOR} kcal a day isn't safe without a doctor, so the lowest target is {KCAL_FLOOR}.</T>}
      <Button title="Save targets" kind="primary" onPress={() => {
        const kcal = Number(v.kcal) || targets.kcal;
        if (kcal < KCAL_FLOOR) return setLow(true);
        onSave({ kcal, p: Number(v.p) || 0, c: Number(v.c) || 0, f: Number(v.f) || 0 });
      }} />
    </View>
  );
}

const WATER_GOAL = 8;

/** Glasses of water today (250 ml each), with a goal of 8. */
function WaterPanel({ glasses, onAdd }: { glasses: number; onAdd: (n: number) => void }) {
  return (
    <Panel>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <View style={{ flex: 1 }}>
          <T variant="label">Water</T>
          <T style={{ fontSize: 22, fontWeight: '800' }}>{glasses} <T variant="muted">of {WATER_GOAL} glasses</T></T>
        </View>
        <Button title="−" onPress={() => onAdd(-1)} disabled={glasses <= 0} />
        <Button title="+ Glass" kind="primary" onPress={() => onAdd(1)} />
      </Row>
      <Row style={{ gap: 4, flexWrap: 'nowrap' }}>
        {Array.from({ length: WATER_GOAL }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < glasses ? Colors.ink : Colors.surface2 }} />
        ))}
      </Row>
    </Panel>
  );
}

/** The last 7 days at a glance: average calories, days on target and weight change. */
function WeekPanel({ days, weights, target, imperial }: { days: Record<string, { kcal: number }[]>; weights: Record<string, number>; target: number; imperial: boolean }) {
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(dayKey(), -i));
  const logged = week.map((d) => (days[d] ?? []).reduce((a, e) => a + e.kcal, 0)).filter((k) => k > 0);
  if (!logged.length) return null;
  const avg = Math.round(logged.reduce((a, k) => a + k, 0) / logged.length);
  const onTarget = logged.filter((k) => k <= target).length;
  const inWeek = Object.keys(weights).filter((d) => d >= week[6]).sort();
  const before = Object.keys(weights).filter((d) => d < week[6]).sort().pop();
  const first = before ?? inWeek[0];
  const last = inWeek[inWeek.length - 1];
  const change = first && last && first !== last ? (weights[last] - weights[first]) * (imperial ? 2.20462 : 1) : null;
  const unit = imperial ? 'lb' : 'kg';
  return (
    <Panel style={{ gap: 6 }}>
      <T variant="label">Your week</T>
      <Row style={{ flexWrap: 'nowrap' }}>
        {[
          [`${avg}`, 'avg kcal a day'],
          [`${onTarget} of ${logged.length}`, 'days on target'],
          [change === null ? '–' : `${change > 0 ? '+' : ''}${Math.round(change * 10) / 10} ${unit}`, 'weight change'],
        ].map(([v, l]) => (
          <View key={l} style={{ flex: 1 }}>
            <T variant="num" style={{ fontSize: 18 }}>{v}</T>
            <T variant="muted" style={{ fontSize: 12 }}>{l}</T>
          </View>
        ))}
      </Row>
    </Panel>
  );
}

function WeightPanel({ weights, goalKg, imperial }: { weights: Record<string, number>; goalKg: number; imperial: boolean }) {
  const show = (kg: number) => Math.round((imperial ? kgToLb(kg) : kg) * 10) / 10;
  const days = Object.keys(weights).sort();
  const latest = days.length ? show(weights[days[days.length - 1]]) : null;
  const pace = goalDate(weights, goalKg);
  return (
    <Pressable onPress={() => router.push('/weight')}>
      <Panel>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="label">Weight</T>
          <T variant="muted">Log weight ›</T>
        </Row>
        <T style={{ fontSize: 28, fontWeight: '800' }}>{latest ?? '–'} <T variant="muted">{imperial ? 'lb' : 'kg'}</T></T>
        <WeightChart points={days.slice(-30).map((d) => ({ day: d, v: show(weights[d]) }))} goal={show(goalKg)} height={100} />
        {pace && <T variant="muted">{pace.reached ? 'You reached your goal weight 🎉' : `At this pace (${Math.abs(Math.round(show(pace.perWeek) * 10) / 10)} ${imperial ? 'lb' : 'kg'} a week) you'll reach your goal by ${niceDate(pace.date)}.`}</T>}
      </Panel>
    </Pressable>
  );
}
