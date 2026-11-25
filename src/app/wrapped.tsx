import { View } from 'react-native';

import { Big, Small, type Slide, Story } from '@/components/story';
import { T } from '@/components/ui';
import { LightColors } from '@/constants/theme';
import { kgToLb } from '@/lib/plan';
import { recapSince } from '@/lib/recap';
import { myXp } from '@/lib/xp';

const CREAM = LightColors.bg, COCOA = '#4A2E1C', SAND = '#F8EFE2', CARAMEL = '#C9A27C', CLAY = '#A8735A';

/** Snapspoon Wrapped: your year in food, as a story to share. */
export default function Wrapped() {
  const year = new Date().getFullYear();
  const r = recapSince(`${year}-01-01`);
  const xp = myXp();
  const lost = r.units === 'imperial' ? `${Math.round(kgToLb(r.lostKg) * 10) / 10} lb` : `${r.lostKg} kg`;
  const badges = xp.badges.filter((b) => b.done);

  const slides: Slide[] = [
    { bg: COCOA, ink: SAND, body: <View style={{ gap: 12 }}><Small ink={SAND}>Snapspoon Wrapped</Small><Big ink={SAND} size={88}>{year}</Big><Small ink={SAND}>{r.name ? `${r.name}, here's` : "Here's"} your year in food.</Small></View> },
    { bg: CREAM, body: <View style={{ gap: 8 }}><Small>You logged</Small><Big size={80}>{r.meals}</Big><Small>meals on {r.days} days</Small>{r.photos > 0 && <Small>and snapped {r.photos} of them 📸</Small>}</View> },
    { bg: SAND, body: (
      <View style={{ gap: 12 }}>
        <Small>Your top foods</Small>
        {r.top.length ? r.top.map(([n, c], i) => (
          <View key={n} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
            <T style={{ fontSize: 34, fontWeight: '900', color: CLAY }}>{i + 1}</T>
            <T style={{ fontSize: 24, fontWeight: '800', color: COCOA, flex: 1 }} numberOfLines={1}>{n}</T>
            <T style={{ color: COCOA, opacity: 0.7 }}>{c}×</T>
          </View>
        )) : <Small>Log some meals to see them here.</Small>}
      </View>
    ) },
    { bg: CARAMEL, body: <View style={{ gap: 8 }}><Small>Your favourite meal</Small><Big size={64}>{r.favMeal || '–'}</Big><Small>{r.onTarget} days on target</Small></View> },
    { bg: CREAM, body: <View style={{ gap: 8 }}><Small>Longest streak</Small><Big size={88}>🔥 {r.streak.best}</Big><Small>days in a row</Small>{r.lostKg > 0 && <Small>and {lost} lighter</Small>}</View> },
    { bg: COCOA, ink: SAND, body: (
      <View style={{ gap: 10 }}>
        <Small ink={SAND}>Level {xp.level} · {xp.xp} XP</Small>
        <Big ink={SAND} size={48}>{badges.length} badges</Big>
        <T style={{ fontSize: 36 }}>{badges.map((b) => b.emoji).join(' ')}</T>
        <Small ink={SAND}>Here's to an even tastier {year + 1}.</Small>
      </View>
    ) },
  ];
  return <Story slides={slides} title={`Wrapped ${year}`} music="sunny" />;
}
