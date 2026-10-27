import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Button, Field, Panel, Segmented, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { ACTIVITY, PACE, calcPlan, kgToLb, lbToKg } from '@/lib/plan';
import { useStore } from '@/lib/store';
import type { Profile, Sex } from '@/lib/types';

type Draft = Partial<Profile> & { units: 'metric' | 'imperial' };
const fmt = (n?: number) => (n ? String(Math.round(n * 10) / 10) : '');

export default function Onboarding() {
  const editing = useLocalSearchParams<{ edit?: string }>().edit === '1';
  const saved = useStore((s) => s.profile);
  const finish = useStore((s) => s.finishOnboarding);
  const [step, setStep] = useState(editing ? 1 : 0);
  const [d, setD] = useState<Draft>(saved ? { ...saved } : { units: 'metric', activity: 1.375, pace: 0.5 });
  const [error, setError] = useState('');
  const imp = d.units === 'imperial';

  // Raw text for numeric inputs, so typing "5." or switching units doesn't fight the user.
  const [age, setAge] = useState(fmt(d.age));
  const [cm, setCm] = useState(fmt(d.heightCm));
  const [ft, setFt] = useState(d.heightCm ? String(Math.floor(d.heightCm / 2.54 / 12)) : '');
  const [inch, setInch] = useState(d.heightCm ? String(Math.round(d.heightCm / 2.54 - Math.floor(d.heightCm / 2.54 / 12) * 12)) : '');
  const [w, setW] = useState(d.weightKg ? fmt(imp ? kgToLb(d.weightKg) : d.weightKg) : '');
  const [goal, setGoal] = useState(d.goalKg ? fmt(imp ? kgToLb(d.goalKg) : d.goalKg) : '');

  const next = () => { setError(''); setStep((s) => s + 1); };
  const back = () => { setError(''); if (editing && step === 1) router.back(); else setStep((s) => s - 1); };
  const switchUnits = (u: 'metric' | 'imperial') => {
    const kg = Number(w) ? (imp ? lbToKg(Number(w)) : Number(w)) : undefined;
    const g = Number(goal) ? (imp ? lbToKg(Number(goal)) : Number(goal)) : undefined;
    setW(kg ? fmt(u === 'imperial' ? kgToLb(kg) : kg) : '');
    setGoal(g ? fmt(u === 'imperial' ? kgToLb(g) : g) : '');
    setD({ ...d, units: u });
  };

  const total = editing ? 3 : 4;
  const shown = editing ? step - 1 : step;
  const progress = (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: i <= shown ? Colors.accent : Colors.line }} />
      ))}
    </View>
  );
  const nav = (label: string, onPress: () => void) => (
    <Row style={{ flexWrap: 'nowrap' }}>
      {(step > 0) && <Button title="Back" onPress={back} />}
      <Button title={label} kind="primary" onPress={onPress} style={{ flex: 1 }} />
    </Row>
  );
  const err = error ? <T style={{ color: Colors.warn }}>{error}</T> : null;

  if (step === 0) {
    return (
      <Screen style={{ gap: 22, paddingTop: 24 }}>
        {progress}
        <View style={{ gap: 8 }}>
          <T variant="title">Lose weight, one plate at a time.</T>
          <T variant="muted" style={{ fontSize: 16 }}>Create your account to get a calorie plan built around your body and your goal.</T>
        </View>
        <Field label="First name" value={d.name ?? ''} onChangeText={(name) => setD({ ...d, name })} autoComplete="given-name" placeholder="Aviv" />
        <Field label="Email" value={d.email ?? ''} onChangeText={(email) => setD({ ...d, email })} autoComplete="email" keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
        {err}
        {nav('Continue', () => {
          if (!d.name?.trim()) return setError('Enter your first name.');
          if (!/^\S+@\S+\.\S+$/.test(d.email ?? '')) return setError('Enter a valid email address.');
          next();
        })}
      </Screen>
    );
  }

  if (step === 1) {
    return (
      <Screen style={{ gap: 18, paddingTop: 24 }}>
        {progress}
        <View style={{ gap: 8 }}>
          <T variant="title">About you</T>
          <T variant="muted" style={{ fontSize: 16 }}>This sets how many calories your body burns each day.</T>
        </View>
        <View style={{ gap: 6 }}>
          <T style={{ fontSize: 13, fontWeight: '600' }}>Gender</T>
          <Segmented<Sex> value={d.sex} onChange={(sex) => setD({ ...d, sex })} options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }, { value: 'other', label: 'Other' }]} />
        </View>
        <Field label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="28" />
        <Row style={{ justifyContent: 'space-between' }}>
          <T style={{ fontSize: 13, fontWeight: '600' }}>Height and weight</T>
          <View style={{ width: 170 }}>
            <Segmented value={d.units} onChange={switchUnits} options={[{ value: 'metric', label: 'kg / cm' }, { value: 'imperial', label: 'lb / ft' }]} />
          </View>
        </Row>
        {imp ? (
          <Row style={{ flexWrap: 'nowrap' }}>
            <View style={{ flex: 1 }}><Field label="Height (ft)" value={ft} onChangeText={setFt} keyboardType="number-pad" placeholder="5" /></View>
            <View style={{ flex: 1 }}><Field label="Height (in)" value={inch} onChangeText={setInch} keyboardType="number-pad" placeholder="7" /></View>
          </Row>
        ) : (
          <Field label="Height (cm)" value={cm} onChangeText={setCm} keyboardType="number-pad" placeholder="170" />
        )}
        <Field label={`Current weight (${imp ? 'lb' : 'kg'})`} value={w} onChangeText={setW} keyboardType="decimal-pad" placeholder={imp ? '180' : '82'} />
        {err}
        {nav('Continue', () => {
          const a = Number(age);
          const h = imp ? (Number(ft) * 12 + (Number(inch) || 0)) * 2.54 : Number(cm);
          const kg = imp ? lbToKg(Number(w)) : Number(w);
          if (!d.sex) return setError('Choose a gender.');
          if (!(a >= 13 && a <= 100)) return setError('Enter an age between 13 and 100.');
          if (!(h >= 120 && h <= 230)) return setError('Enter your height.');
          if (!(kg >= 30 && kg <= 300)) return setError('Enter your current weight.');
          setD({ ...d, age: a, heightCm: h, weightKg: kg });
          next();
        })}
      </Screen>
    );
  }

  if (step === 2) {
    return (
      <Screen style={{ gap: 18, paddingTop: 24 }}>
        {progress}
        <View style={{ gap: 8 }}>
          <T variant="title">Your goal</T>
          <T variant="muted" style={{ fontSize: 16 }}>Where you want to get to, and how fast.</T>
        </View>
        <Field label={`Goal weight (${imp ? 'lb' : 'kg'})`} value={goal} onChangeText={setGoal} keyboardType="decimal-pad" placeholder={imp ? '160' : '72'} />
        <View style={{ gap: 8 }}>
          <T style={{ fontSize: 13, fontWeight: '600' }}>How active are you?</T>
          {ACTIVITY.map((a) => (
            <Pressable key={a.value} onPress={() => setD({ ...d, activity: a.value })} accessibilityState={{ selected: d.activity === a.value }}
              style={{ borderWidth: 1.5, borderColor: d.activity === a.value ? Colors.accent : Colors.line, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14 }}>
              <T style={{ fontWeight: '700' }}>{a.title}</T>
              <T variant="muted">{a.sub}</T>
            </Pressable>
          ))}
        </View>
        <View style={{ gap: 6 }}>
          <T style={{ fontSize: 13, fontWeight: '600' }}>Pace</T>
          <Segmented value={d.pace} onChange={(pace) => setD({ ...d, pace })} options={PACE.map((p) => ({ value: p.value, label: p.title }))} />
          <T variant="muted">{PACE.find((p) => p.value === d.pace)?.sub}</T>
        </View>
        {err}
        {nav('See my plan', () => {
          const g = imp ? lbToKg(Number(goal)) : Number(goal);
          if (!(g >= 30 && g <= 300)) return setError('Enter your goal weight.');
          setD({ ...d, goalKg: g });
          next();
        })}
      </Screen>
    );
  }

  const profile = d as Profile;
  const plan = calcPlan(profile);
  const u = (kg: number) => (imp ? `${Math.round(kgToLb(kg))} lb` : `${Math.round(kg * 10) / 10} kg`);
  const when = plan.weeks ? new Date(Date.now() + plan.weeks * 7 * 864e5).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '';
  return (
    <Screen style={{ gap: 18, paddingTop: 24 }}>
      {progress}
      <View style={{ gap: 8 }}>
        <T variant="title">{d.name ? `${d.name}, here's your plan` : 'Your plan'}</T>
        <T variant="muted" style={{ fontSize: 16 }}>
          {plan.losing ? `From ${u(profile.weightKg)} to ${u(profile.goalKg)}, reaching your goal around ${when} (${plan.weeks} weeks).` : 'Your goal is at or above your current weight, so this plan keeps you steady.'}
        </T>
      </View>
      <View style={{ backgroundColor: Colors.accent, borderRadius: 24, padding: 24, gap: 4 }}>
        <T style={{ color: Colors.accentInk, fontSize: 13 }}>Daily calorie target</T>
        <T style={{ color: Colors.accentInk, fontSize: 64, fontWeight: '800', letterSpacing: -2 }}>{plan.kcal}</T>
        <T style={{ color: Colors.accentInk, fontSize: 13 }}>You burn about {plan.tdee} kcal a day{plan.losing ? `, so this is a ${plan.tdee - plan.kcal} kcal daily deficit` : ''}.</T>
      </View>
      <Row style={{ flexWrap: 'nowrap' }}>
        {[['Protein', plan.p], ['Carbs', plan.c], ['Fat', plan.f]].map(([l, v]) => (
          <Panel key={l} style={{ flex: 1, padding: 12, gap: 2 }}>
            <T variant="num" style={{ fontSize: 20 }}>{v}g</T>
            <T variant="muted">{l}</T>
          </Panel>
        ))}
      </Row>
      <T variant="muted">BMI {plan.bmi.toFixed(1)}. Estimates use the Mifflin-St Jeor formula. You can change your targets any time from Today. This isn't medical advice, so check with a doctor before a big change in diet.</T>
      {nav(editing ? 'Save my plan' : 'Start using Biteboard', () => {
        finish(profile);
        router.replace('/');
      })}
    </Screen>
  );
}
