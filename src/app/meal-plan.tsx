import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Share, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Button, Field, Panel, Segmented, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { aiConfigured, planWeek } from '@/lib/ai';
import { dayKey } from '@/lib/dates';
import { useExtras } from '@/lib/extras';
import { haptic } from '@/lib/haptics';
import { usePro } from '@/lib/pro';
import { aiLeft, useStore } from '@/lib/store';

/** An AI meal plan for the week that hits your calories, with a grocery list you can tick off. */
export default function MealPlan() {
  const { targets, addEntry, countAiUse } = useStore();
  const isPro = usePro((s) => s.isPro);
  const { plan, groceryDone, set } = useExtras();
  const [tab, setTab] = useState<'meals' | 'grocery'>('meals');
  const [prefs, setPrefs] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const make = async () => {
    if (!isPro && aiLeft('recipes') <= 0) return router.push('/pro');
    setBusy(true); setError('');
    try {
      const p = await planWeek({ kcal: targets.kcal, protein: targets.p, prefs: prefs.trim() || undefined });
      set({ plan: { ...p, made: dayKey(), kcal: targets.kcal }, groceryDone: [] });
      if (!isPro) countAiUse('recipes');
      haptic.success();
    } catch (e) { setError(e instanceof Error ? e.message : 'The plan did not come back. Try again.'); }
    setBusy(false);
  };

  const toggle = (item: string) => { haptic.select(); set({ groceryDone: groceryDone.includes(item) ? groceryDone.filter((x) => x !== item) : [...groceryDone, item] }); };
  const shareList = () => plan && Share.share({ message: plan.grocery.map((g) => `${g.aisle}\n${g.items.map((i) => `• ${i}`).join('\n')}`).join('\n\n') });
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Meal plan</T>
      {plan ? <T variant="muted">Made {plan.made} for {plan.kcal} kcal a day</T> : <T variant="muted">A week of simple meals around {targets.kcal} kcal and {targets.p} g protein a day, plus the shopping list.</T>}
      <Field label="Anything to include or avoid?" value={prefs} onChangeText={setPrefs} placeholder="Vegetarian, no mushrooms, quick dinners" />
      <Button title={busy ? 'Planning your week…' : plan ? 'Make a new plan' : 'Plan my week'} kind="primary" disabled={busy || !aiConfigured} onPress={make}
        icon={busy ? <ActivityIndicator color={Colors.accentInk} /> : undefined} />
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}

      {plan && (
        <>
          <Segmented value={tab} onChange={setTab} options={[{ value: 'meals', label: 'Meals' }, { value: 'grocery', label: 'Grocery list' }]} />
          {tab === 'meals' ? plan.days.map((d) => (
            <Panel key={d.day} style={{ gap: 8, borderWidth: d.day === today ? 2 : 0, borderColor: Colors.accent }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T variant="h3">{d.day}{d.day === today ? ' · today' : ''}</T>
                <T variant="num">{Math.round(d.meals.reduce((a, m) => a + m.kcal, 0))} kcal</T>
              </Row>
              {d.meals.map((m) => (
                <Row key={m.meal + m.title} style={{ flexWrap: 'nowrap' }}>
                  <View style={{ flex: 1 }}>
                    <T variant="label">{m.meal}</T>
                    <T>{m.title}</T>
                    <T variant="muted">{Math.round(m.kcal)} kcal · {Math.round(m.protein)} g protein</T>
                  </View>
                  <Pressable hitSlop={8} onPress={() => router.push({ pathname: '/ai-recipe', params: { prompt: `${m.title}, about ${Math.round(m.kcal)} kcal per serving` } })}><T variant="muted">Recipe</T></Pressable>
                  <Pressable hitSlop={8} onPress={() => { addEntry({ name: m.title, kcal: m.kcal, p: m.protein, c: 0, f: 0, meal: m.meal, src: 'manual' }); }}><T style={{ color: Colors.accent, fontWeight: '700' }}>Log</T></Pressable>
                </Row>
              ))}
            </Panel>
          )) : (
            <>
              {plan.grocery.map((g) => (
                <Panel key={g.aisle} style={{ gap: 6 }}>
                  <T variant="label">{g.aisle}</T>
                  {g.items.map((i) => {
                    const done = groceryDone.includes(i);
                    return (
                      <Pressable key={i} onPress={() => toggle(i)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 4 }} accessibilityRole="checkbox" accessibilityState={{ checked: done }}>
                        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.accent, backgroundColor: done ? Colors.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                          {done && <T style={{ color: Colors.accentInk, fontSize: 13, fontWeight: '800' }}>✓</T>}
                        </View>
                        <T style={{ flex: 1, textDecorationLine: done ? 'line-through' : 'none', color: done ? Colors.muted : Colors.ink }}>{i}</T>
                      </Pressable>
                    );
                  })}
                </Panel>
              ))}
              <Button title="Share the list" onPress={shareList} />
            </>
          )}
        </>
      )}
    </Screen>
  );
}
