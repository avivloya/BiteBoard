import { useState } from 'react';
import { type GestureResponderHandlers, StyleSheet, Text, View } from 'react-native';

import type { VideoText } from '@/lib/types';

/** Words on a video, placed by % so they sit in the same spot on any screen. */
export function VideoTexts({ texts, selected, onLayout }: { texts?: VideoText[]; selected?: number | null; onLayout?: (w: number, h: number) => void }) {
  const [w, setW] = useState(0);
  if (!texts?.length) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => { setW(e.nativeEvent.layout.width); onLayout?.(e.nativeEvent.layout.width, e.nativeEvent.layout.height); }}>
      {w > 0 && texts.map((t, i) => <TextChip key={i} t={t} width={w} on={selected === i} />)}
    </View>
  );
}

export function TextChip({ t, width, on, handlers }: { t: VideoText; width: number; on?: boolean; handlers?: GestureResponderHandlers }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const fontSize = Math.max(10, (t.size / 100) * width);
  return (
    <View
      {...handlers}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{
        position: 'absolute', left: `${t.x}%`, top: `${t.y}%`, maxWidth: width * 0.86,
        transform: [{ translateX: -box.w / 2 }, { translateY: -box.h / 2 }], opacity: box.w ? 1 : 0,
        paddingHorizontal: fontSize * 0.45, paddingVertical: fontSize * 0.15, borderRadius: fontSize * 0.4,
        backgroundColor: t.style === 'pill' ? 'rgba(18,12,7,0.55)' : 'transparent',
        borderWidth: on ? 2 : 0, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.85)',
      }}>
      <Text style={{ color: t.color, fontSize, fontWeight: '800', lineHeight: fontSize * 1.15, textAlign: 'center', textShadowColor: t.style === 'plain' ? 'rgba(0,0,0,0.55)' : 'transparent', textShadowRadius: 8 }}>{t.text}</Text>
    </View>
  );
}
