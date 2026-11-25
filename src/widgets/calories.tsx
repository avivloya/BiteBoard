import { Gauge, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, gaugeStyle, padding, tint, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, createWidget } from 'expo-widgets';

// Home Screen, Lock Screen and Dynamic Island views. These run inside iOS, not in the app,
// so they only use the values passed in and plain colors (no app imports).
export type CaloriesProps = { left: number; eaten: number; goal: number; streak: number; protein: number };

const empty: CaloriesProps = { left: 0, eaten: 0, goal: 0, streak: 0, protein: 0 };

export const CaloriesWidget = createWidget<CaloriesProps>('SnapspoonToday', (p, env) => {
  'widget';
  const over = p.goal > 0 && p.eaten > p.goal;
  const ink = env.colorScheme === 'dark' ? '#F3E4CE' : '#4A2E1C';
  const bg = env.colorScheme === 'dark' ? '#1E140D' : '#E2CEB1';
  const accent = over ? '#B5562C' : env.colorScheme === 'dark' ? '#D9AE7E' : '#6B4026';
  const left = Math.round(Math.abs(p.goal - p.eaten));
  const fam = env.widgetFamily;

  if (fam === 'accessoryInline') {
    return <Text modifiers={[widgetURL('snapspoon://today')]}>{`${left} kcal ${over ? 'over' : 'left'} · 🔥${p.streak}`}</Text>;
  }
  if (fam === 'accessoryCircular') {
    return (
      <Gauge value={Math.min(p.eaten, p.goal || 1)} min={0} max={p.goal || 1} currentValueLabel={<Text>{String(left)}</Text>}
        modifiers={[gaugeStyle('circularCapacity'), widgetURL('snapspoon://today')]}>
        <Text>kcal</Text>
      </Gauge>
    );
  }
  if (fam === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" modifiers={[widgetURL('snapspoon://today')]}>
        <Text modifiers={[font({ weight: 'bold', size: 15 })]}>{`${left} kcal ${over ? 'over' : 'left'}`}</Text>
        <Text modifiers={[font({ size: 12 })]}>{`${Math.round(p.eaten)} of ${Math.round(p.goal)} · 🔥 ${p.streak} days`}</Text>
      </VStack>
    );
  }
  // Home Screen, small and medium.
  return (
    <VStack alignment="leading" spacing={6} modifiers={[containerBackground(bg, 'widget'), widgetURL('snapspoon://today')]}>
      <HStack>
        <Text modifiers={[font({ weight: 'semibold', size: 13 }), foregroundStyle(ink)]}>Snapspoon</Text>
        <Spacer />
        <Text modifiers={[font({ size: 13 }), foregroundStyle(ink)]}>{`🔥 ${p.streak}`}</Text>
      </HStack>
      <Spacer />
      <Text modifiers={[font({ weight: 'bold', size: 34, design: 'rounded' }), foregroundStyle(accent)]}>{String(left)}</Text>
      <Text modifiers={[font({ size: 13 }), foregroundStyle(ink)]}>{over ? 'kcal over' : 'kcal left'}</Text>
      <Gauge value={Math.min(p.eaten, p.goal || 1)} min={0} max={p.goal || 1} modifiers={[gaugeStyle('linearCapacity'), tint(accent)]} />
      {fam === 'systemMedium' ? <Text modifiers={[font({ size: 12 }), foregroundStyle(ink)]}>{`${Math.round(p.eaten)} eaten · ${Math.round(p.protein)} g protein`}</Text> : null}
    </VStack>
  );
}, empty);

/** Calories left, on the Lock Screen and in the Dynamic Island while you track a day. */
export const CaloriesActivity = createLiveActivity<CaloriesProps>('SnapspoonLive', (p) => {
  'widget';
  const over = p.goal > 0 && p.eaten > p.goal;
  const left = Math.round(Math.abs(p.goal - p.eaten));
  const label = `${left} kcal ${over ? 'over' : 'left'}`;
  return {
    banner: (
      <HStack modifiers={[padding({ all: 14 })]}>
        <Image systemName="flame.fill" color={over ? '#B5562C' : '#6B4026'} />
        <VStack alignment="leading">
          <Text modifiers={[font({ weight: 'bold', size: 20, design: 'rounded' })]}>{label}</Text>
          <Text modifiers={[font({ size: 13 })]}>{`${Math.round(p.eaten)} of ${Math.round(p.goal)} kcal · 🔥 ${p.streak} day streak`}</Text>
        </VStack>
        <Spacer />
        <Gauge value={Math.min(p.eaten, p.goal || 1)} min={0} max={p.goal || 1} modifiers={[gaugeStyle('circularCapacity'), tint(over ? '#B5562C' : '#6B4026')]} />
      </HStack>
    ),
    bannerSmall: <Text modifiers={[font({ weight: 'bold', size: 14 })]}>{label}</Text>,
    compactLeading: <Image systemName="flame.fill" color={over ? '#E58A5C' : '#D9AE7E'} />,
    compactTrailing: <Text modifiers={[font({ weight: 'bold', size: 14, design: 'rounded' })]}>{String(left)}</Text>,
    minimal: <Text modifiers={[font({ weight: 'bold', size: 12 })]}>{String(left)}</Text>,
    expandedCenter: <Text modifiers={[font({ weight: 'bold', size: 18, design: 'rounded' })]}>{label}</Text>,
    expandedBottom: <Gauge value={Math.min(p.eaten, p.goal || 1)} min={0} max={p.goal || 1} modifiers={[gaugeStyle('linearCapacity'), tint('#D9AE7E')]} />,
  };
});
