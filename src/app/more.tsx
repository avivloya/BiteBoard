import { type Href, router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/screen';
import { T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';

const GROUPS: { title: string; items: { emoji: string; name: string; sub: string; href: Href }[] }[] = [
  { title: 'Log faster', items: [
    { emoji: '📷', name: 'Live camera', sub: 'Calories as you point', href: '/live-snap' },
    { emoji: '🎙️', name: 'Say it', sub: 'Log by voice', href: '/voice-log' },
    { emoji: '🍽️', name: 'Menu scan', sub: 'What fits when eating out', href: '/menu' },
    { emoji: '🥣', name: 'Portion guide', sub: 'See what 100 g looks like', href: '/portions' },
  ] },
  { title: 'Plan and cook', items: [
    { emoji: '🤖', name: 'What to eat', sub: 'AI coach ideas', href: '/coach' },
    { emoji: '🗓️', name: 'Meal plan', sub: 'A week + grocery list', href: '/meal-plan' },
    { emoji: '🧊', name: 'Fridge scan', sub: 'Recipes from what you have', href: '/fridge' },
    { emoji: '🔗', name: 'Import recipe', sub: 'From a link or TikTok', href: '/import-recipe' },
  ] },
  { title: 'Progress', items: [
    { emoji: '🏅', name: 'Badges and XP', sub: 'Levels and streak freezes', href: '/badges' },
    { emoji: '🎬', name: 'Weekly recap', sub: 'Your week as a story', href: '/recap' },
    { emoji: '🎁', name: 'Wrapped', sub: 'Your year in food', href: '/wrapped' },
    { emoji: '🪞', name: 'Progress photos', sub: 'Before and after', href: '/progress' },
    { emoji: '🙂', name: 'Mood check-in', sub: 'Food and how you feel', href: '/mood' },
    { emoji: '📊', name: 'Share stats', sub: 'A card for your story', href: '/share-stats' },
  ] },
  { title: 'Together', items: [
    { emoji: '🏁', name: 'Challenges', sub: 'Leaderboards with friends', href: '/challenges' },
    { emoji: '🔴', name: 'Live classes', sub: 'Cook along with chefs', href: '/classes' },
    { emoji: '👩‍🍳', name: 'Healthy chefs', sub: 'Verified creators', href: '/chefs' },
  ] },
];

/** Every Snapspoon tool in one place. */
export default function More() {
  let n = 0;
  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Everything Snapspoon</T>
      {GROUPS.map((g) => (
        <View key={g.title} style={{ gap: 10 }}>
          <T variant="label">{g.title}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {g.items.map((it) => (
              <Animated.View key={it.name} entering={FadeInDown.delay(Math.min(n++, 12) * 35)} style={{ width: '48%' }}>
                <Pressable onPress={() => router.push(it.href)} accessibilityRole="button"
                  style={({ pressed }) => ({ backgroundColor: Colors.bg, borderRadius: Radius.lg, padding: 14, gap: 4, opacity: pressed ? 0.8 : 1, minHeight: 104 })}>
                  <T style={{ fontSize: 28 }}>{it.emoji}</T>
                  <T style={{ fontWeight: '700' }}>{it.name}</T>
                  <T variant="muted" style={{ fontSize: 12 }}>{it.sub}</T>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}
