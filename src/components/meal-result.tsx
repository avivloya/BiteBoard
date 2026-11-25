import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import type { MealEstimate } from '@/lib/ai';
import { guessMeal } from '@/lib/dates';
import { MEALS, type Meal } from '@/lib/types';
import { Row } from './screen';
import { Button, Panel, Segmented, T } from './ui';

export type MealSum = { kcal: number; p: number; c: number; f: number };

/** Editable list of foods from an AI estimate, with totals and "Add to today". */
export function MealResult({ result, onChange, onAdd, onReset }: {
  result: MealEstimate; onChange: (r: MealEstimate) => void; onAdd: (name: string, sum: MealSum, meal: Meal) => void; onReset: () => void;
}) {
  const [meal, setMeal] = useState<Meal>(guessMeal());
  const items = result.items;
  const sum = items.reduce((a, i) => ({ kcal: a.kcal + i.kcal, p: a.p + i.protein, c: a.c + i.carbs, f: a.f + i.fat }), { kcal: 0, p: 0, c: 0, f: 0 });
  const edit = (i: number, key: 'name' | 'grams', v: string) =>
    onChange({
      ...result,
      items: items.map((it, j) => {
        if (j !== i) return it;
        if (key === 'name') return { ...it, name: v };
        const g = Number(v) || 0, f = it.grams > 0 && g > 0 ? g / it.grams : 1;
        return { ...it, grams: g, kcal: it.kcal * f, protein: it.protein * f, carbs: it.carbs * f, fat: it.fat * f };
      }),
    });
  return (
    <Panel style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <T variant="h3" style={{ flex: 1 }} numberOfLines={1}>{result.meal_name || 'Your meal'}</T>
        <T variant="label">{result.confidence} confidence</T>
      </Row>
      {items.length ? items.map((it, i) => (
        <Row key={i} style={{ flexWrap: 'nowrap', borderBottomWidth: 1, borderBottomColor: Colors.divider, paddingBottom: 6 }}>
          <TextInput value={it.name} onChangeText={(v) => edit(i, 'name', v)} style={{ flex: 1, fontSize: 15, fontWeight: '600', color: Colors.ink, paddingVertical: 4 }} />
          <TextInput value={String(Math.round(it.grams))} onChangeText={(v) => edit(i, 'grams', v)} keyboardType="number-pad" accessibilityLabel={`${it.name} grams`}
            style={{ width: 48, textAlign: 'right', fontFamily: Fonts.mono, fontSize: 13, color: Colors.ink, backgroundColor: Colors.surface2, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4 }} />
          <T variant="muted">g</T>
          <T variant="num" style={{ width: 64, textAlign: 'right' }}>{Math.round(it.kcal)} kcal</T>
          <Pressable onPress={() => onChange({ ...result, items: items.filter((_, j) => j !== i) })} accessibilityLabel={`Remove ${it.name}`} hitSlop={10}>
            <T variant="muted">✕</T>
          </Pressable>
        </Row>
      )) : <T>No food found. Try again with a bit more detail.</T>}
      {!!result.notes && <T variant="muted">{result.notes}</T>}
      <View>
        <T variant="num" style={{ fontSize: 22 }}>{Math.round(sum.kcal)} kcal</T>
        <T variant="muted">{Math.round(sum.p)}g protein · {Math.round(sum.c)}g carbs · {Math.round(sum.f)}g fat</T>
      </View>
      <Segmented value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m, label: m }))} />
      <Row style={{ flexWrap: 'nowrap' }}>
        <Button title="Start over" kind="ghost" onPress={onReset} />
        <Button title="Add to today" kind="primary" style={{ flex: 1 }} disabled={!items.length} onPress={() => onAdd(result.meal_name || 'Meal', sum, meal)} />
      </Row>
      <T variant="muted" style={{ fontSize: 11 }}>AI estimates can be off. Check portions before you add them.</T>
    </Panel>
  );
}
