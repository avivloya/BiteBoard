import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import type { Recipe } from '@/lib/types';
import { RecipeArt } from './plate';

const HEIGHTS = [210, 260, 230, 290, 240, 270];

export function RecipeCard({ recipe, index }: { recipe: Recipe; index: number }) {
  const h = HEIGHTS[(index * 7 + recipe.id.length) % HEIGHTS.length];
  return (
    <Pressable onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} accessibilityLabel={recipe.title}>
      <View style={[styles.tile, { height: h }]}>
        <RecipeArt recipe={recipe} style={StyleSheet.absoluteFill} />
      </View>
      <Text style={styles.title} numberOfLines={2}>{recipe.title}</Text>
      <Text style={styles.meta}>
        {recipe.by && (
          <Text style={styles.by} onPress={recipe.byId ? () => router.push({ pathname: '/person/[id]', params: { id: recipe.byId! } }) : undefined}>@{recipe.by} · </Text>
        )}
        {Math.round(recipe.kcal)} kcal · {recipe.min} min
      </Text>
    </Pressable>
  );
}

/** Two-column Pinterest-style board: each card goes into the shorter column. */
export function Masonry({ recipes }: { recipes: Recipe[] }) {
  const cols: [Recipe[], Recipe[]] = [[], []];
  const heights = [0, 0];
  recipes.forEach((r, i) => {
    const c = heights[0] <= heights[1] ? 0 : 1;
    cols[c].push(r);
    heights[c] += HEIGHTS[(i * 7 + r.id.length) % HEIGHTS.length] + 60;
  });
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {cols.map((col, ci) => (
        <View key={ci} style={{ flex: 1, gap: 18 }}>
          {col.map((r) => <RecipeCard key={r.id} recipe={r} index={recipes.indexOf(r)} />)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4 },
  tile: { borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.tile },
  title: { fontSize: 15, fontWeight: '600', color: Colors.ink, marginTop: 6, paddingHorizontal: 2 },
  meta: { fontSize: 12, color: Colors.muted, paddingHorizontal: 2 },
  by: { fontWeight: '700', color: Colors.ink },
});
