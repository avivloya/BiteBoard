import { View } from 'react-native';

import { RecipeArt } from '@/components/plate';
import { Big, Small, type Slide, Story } from '@/components/story';
import { T } from '@/components/ui';
import { LightColors } from '@/constants/theme';
import { LIBRARY } from '@/data/recipes';
import { dayKey, shiftDay } from '@/lib/dates';
import { kgToLb } from '@/lib/plan';
import { recapSince } from '@/lib/recap';
import type { Recipe } from '@/lib/types';

const CREAM = LightColors.bg, COCOA = '#4A2E1C', SAND = '#F8EFE2', CARAMEL = '#C9A27C';

const plateFor = (name: string): Recipe =>
  LIBRARY.find((r) => r.title.toLowerCase() === name.toLowerCase()) ?? { id: name, title: name, cat: 'Lunch', min: 0, serv: 1, kcal: 0, p: 0, c: 0, f: 0, tags: [], ing: [], steps: [] };

/** Your week in food, as a short story with music. */
export default function Recap() {
  const r = recapSince(shiftDay(dayKey(), -6));
  const lost = r.units === 'imperial' ? `${Math.round(kgToLb(r.lostKg) * 10) / 10} lb` : `${r.lostKg} kg`;
  const meals = r.entries.slice(-6);

  const slides: Slide[] = [
    { bg: CREAM, body: <View style={{ gap: 10 }}><Small>{r.name ? `${r.name}'s` : 'Your'} week in food</Small><Big size={64}>{r.meals} meals</Big><Small>logged over {r.days} days</Small></View> },
    meals.length
      ? { bg: SAND, body: (
          <View style={{ gap: 14 }}>
            <Small>On the menu</Small>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {meals.map((e) => (
                <View key={e.id} style={{ width: '47%', gap: 4 }}>
                  <RecipeArt recipe={plateFor(e.name)} style={{ height: 120, borderRadius: 18, overflow: 'hidden' }} />
                  <T numberOfLines={1} style={{ color: COCOA, fontWeight: '700' }}>{e.name}</T>
                </View>
              ))}
            </View>
          </View>
        ) }
      : { bg: SAND, body: <Big>Log a few meals to fill your recap</Big> },
    { bg: COCOA, ink: SAND, body: <View style={{ gap: 10 }}><Small ink={SAND}>Days on target</Small><Big ink={SAND} size={96}>{r.onTarget}/7</Big></View> },
    { bg: CARAMEL, body: <View style={{ gap: 10 }}><Small>Protein this week</Small><Big size={80}>{r.protein} g</Big>{r.bestProteinDay && <Small>Best day: {Math.round(r.bestProteinDay.p)} g</Small>}</View> },
    { bg: CREAM, body: <View style={{ gap: 10 }}><Big size={80}>🔥 {r.streak.current}</Big><Small>day streak{r.lostKg > 0 ? ` · ${lost} down` : ''}</Small><Small>See you next week.</Small></View> },
  ];
  return <Story slides={slides} title="Weekly recap" music="upbeat" />;
}
