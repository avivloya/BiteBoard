import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Glass } from '@/components/glass';
import { Screen } from '@/components/screen';
import { Button, T } from '@/components/ui';
import { Colors, LightColors } from '@/constants/theme';

// Sizes in cm for 100 g of each food, as it sits on a plate. w x h; round foods have w = h.
const FOODS = [
  { id: 'rice', name: 'Rice (cooked)', w: 8, h: 8, round: true, kcal: 130, like: 'a cupped hand' },
  { id: 'pasta', name: 'Pasta (cooked)', w: 9, h: 9, round: true, kcal: 158, like: 'a tennis ball' },
  { id: 'chicken', name: 'Chicken breast', w: 9, h: 6, round: false, kcal: 165, like: 'a deck of cards' },
  { id: 'salmon', name: 'Salmon', w: 10, h: 6, round: false, kcal: 208, like: 'your palm' },
  { id: 'steak', name: 'Steak', w: 9, h: 6.5, round: false, kcal: 250, like: 'a deck of cards' },
  { id: 'potato', name: 'Potato', w: 7, h: 6, round: true, kcal: 87, like: 'a computer mouse' },
  { id: 'veg', name: 'Vegetables', w: 12, h: 12, round: true, kcal: 35, like: 'two fists' },
  { id: 'cheese', name: 'Cheese (30 g)', w: 5, h: 2.5, round: false, kcal: 120, like: 'two dice' },
] as const;
const PLATE_CM = 26; // a standard dinner plate

/** Plate guide: line your plate up with the ring and see how big 100 g of a food looks on it. */
export default function Portions() {
  const [perm, ask] = useCameraPermissions();
  const { width } = useWindowDimensions();
  const [food, setFood] = useState<(typeof FOODS)[number]>(FOODS[0]);
  const [grams, setGrams] = useState(100);
  const plate = width * 0.86;
  const px = plate / PLATE_CM;
  const k = Math.sqrt(grams / 100); // area grows with the amount

  if (!perm?.granted) {
    return (
      <Screen edges={['top']} bg={Colors.surface}>
        <T variant="h2">Portion guide</T>
        <T variant="muted">Point your camera at your plate to see what a portion looks like.</T>
        <Button title="Allow camera" kind="primary" onPress={ask} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />
      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close"><T style={{ color: '#fff', fontSize: 26 }}>✕</T></Pressable>
          <Glass strong style={{ borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12 }}>
            <T style={{ color: LightColors.ink, fontWeight: '700' }}>Fit your plate in the ring</T>
          </Glass>
        </View>

        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: plate, height: plate, borderRadius: plate / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View key={food.id + grams} entering={ZoomIn.springify()}
              style={{ width: food.w * px * k, height: food.h * px * k, borderRadius: food.round ? 999 : 10, backgroundColor: 'rgba(217,174,126,0.55)', borderWidth: 2, borderColor: '#FFF8EE' }} />
          </View>
        </View>

        <View style={{ padding: 16, gap: 10 }}>
          <Glass strong style={{ borderRadius: 20, padding: 14, gap: 4 }}>
            <T style={{ color: LightColors.ink, fontWeight: '800', fontSize: 18 }}>{grams} g {food.name.toLowerCase()} ≈ {Math.round((food.kcal * grams) / 100)} kcal</T>
            <T style={{ color: LightColors.muted }}>100 g is about the size of {food.like}.</T>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              {[50, 100, 150, 200].map((g) => (
                <Pressable key={g} onPress={() => setGrams(g)} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: g === grams ? LightColors.ink : 'rgba(255,255,255,0.5)' }}>
                  <T style={{ color: g === grams ? '#FFF8EE' : LightColors.ink, fontWeight: '700' }}>{g} g</T>
                </Pressable>
              ))}
            </View>
          </Glass>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {FOODS.map((f) => (
              <Pressable key={f.id} onPress={() => setFood(f)} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: f.id === food.id ? LightColors.bg : 'rgba(0,0,0,0.45)' }}>
                <T style={{ color: f.id === food.id ? LightColors.ink : '#fff', fontWeight: '700' }}>{f.name}</T>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}
