import { Image } from 'expo-image';
import { useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { useStore } from '@/lib/store';
import type { Recipe } from '@/lib/types';

function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
    return (h % 1000) / 1000;
  };
}

/** Recipe artwork: the recipe's photo when it has one, otherwise a drawn plate in warm tones. */
export function RecipeArt({ recipe, style }: { recipe: Recipe; style?: ViewStyle }) {
  const image = useStore((s) => s.photos[recipe.id]) ?? recipe.image;
  const blobs = useMemo(() => {
    const r = seeded(recipe.id);
    return Array.from({ length: 3 + Math.floor(r() * 3) }, (_, i) => {
      const a = r() * Math.PI * 2, d = r() * 22;
      return { cx: 50 + Math.cos(a) * d, cy: 50 + Math.sin(a) * d, rx: 9 + r() * 12, ry: 7 + r() * 10, rot: r() * 180,
        fill: `hsl(${14 + ((i * 23 + Math.floor(r() * 40)) % 34)}, 34%, ${40 + Math.floor(r() * 22)}%)` };
    });
  }, [recipe.id]);

  if (image) {
    return (
      <View style={[{ backgroundColor: Colors.tile, overflow: 'hidden' }, style]}>
        <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} accessibilityLabel={recipe.title} />
      </View>
    );
  }
  return (
    <View style={[{ backgroundColor: Colors.tile2, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg viewBox="0 0 100 100" width="76%" height="76%">
        <Circle cx={50} cy={53} r={46} fill="rgba(74,46,28,0.08)" />
        <Circle cx={50} cy={50} r={46} fill="#FFFAF2" />
        <Circle cx={50} cy={50} r={36} fill="none" stroke={Colors.line} strokeWidth={1} />
        {blobs.map((b, i) => (
          <Ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={b.fill} transform={`rotate(${b.rot} ${b.cx} ${b.cy})`} />
        ))}
      </Svg>
    </View>
  );
}
