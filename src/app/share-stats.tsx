import { type ComponentRef, useRef, useState } from 'react';
import { View } from 'react-native';

import { Logo } from '@/components/logo';
import { Screen } from '@/components/screen';
import { Button, Segmented, T } from '@/components/ui';
import { Colors, LightColors } from '@/constants/theme';
import { kgToLb } from '@/lib/plan';
import { shareView } from '@/lib/share-image';
import { myStats } from '@/lib/stats';
import { useStore } from '@/lib/store';

const LOOKS = [
  { value: 'cream', label: 'Cream', bg: LightColors.bg, ink: LightColors.ink, sub: LightColors.muted },
  { value: 'cocoa', label: 'Cocoa', bg: '#4A2E1C', ink: '#FFF8EE', sub: '#E2CEB1' },
  { value: 'sand', label: 'Sand', bg: '#F8EFE2', ink: '#6B4026', sub: '#A8735A' },
] as const;

/** A pretty card of your streak and progress to post on Instagram stories or send to friends. */
export default function ShareStats() {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const imperial = useStore((s) => s.profile?.units === 'imperial');
  const [look, setLook] = useState<(typeof LOOKS)[number]['value']>('cream');
  const st = myStats(7);
  const L = LOOKS.find((x) => x.value === look)!;
  const lost = imperial ? Math.round(kgToLb(st.lostKg) * 10) / 10 : st.lostKg;

  const Stat = ({ big, label }: { big: string; label: string }) => (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <T style={{ fontSize: 30, fontWeight: '800', color: L.ink }}>{big}</T>
      <T style={{ fontSize: 12, color: L.sub, textAlign: 'center' }}>{label}</T>
    </View>
  );

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Share your progress</T>
      <View ref={ref} collapsable={false} style={{ backgroundColor: L.bg, borderRadius: 28, padding: 26, gap: 22, aspectRatio: 4 / 5, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Logo size={30} color={L.ink} ring={L.bg} />
          <T style={{ fontWeight: '800', fontSize: 18, color: L.ink }}>Snapspoon</T>
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <T style={{ fontSize: 76, fontWeight: '900', color: L.ink, letterSpacing: -2 }}>🔥 {st.streak.current}</T>
          <T style={{ fontSize: 18, fontWeight: '700', color: L.ink }}>day streak</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat big={`${st.onTarget}/7`} label="days on target this week" />
          <Stat big={st.avgKcal ? String(st.avgKcal) : '–'} label="average kcal a day" />
          <Stat big={lost > 0 ? `-${lost}` : '–'} label={imperial ? 'lb so far' : 'kg so far'} />
        </View>
        <T style={{ textAlign: 'center', color: L.sub, fontSize: 13 }}>{st.name ? `${st.name} is ` : ''}eating well with Snapspoon</T>
      </View>
      <Segmented value={look} onChange={setLook} options={LOOKS.map((x) => ({ value: x.value, label: x.label }))} />
      <Button title="Share" kind="primary" onPress={() => shareView(ref)} />
    </Screen>
  );
}
