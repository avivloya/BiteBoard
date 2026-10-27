import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps, type ViewStyle } from 'react-native';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export function T({ style, variant = 'body', ...rest }: TextProps & { variant?: 'title' | 'h2' | 'h3' | 'body' | 'muted' | 'label' | 'num' }) {
  return <Text {...rest} style={[styles[variant], style]} />;
}

export function Button({
  title, onPress, kind = 'secondary', disabled, icon, style,
}: { title: string; onPress?: () => void; kind?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; icon?: ReactNode; style?: ViewStyle }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, kind === 'primary' && styles.btnPrimary, kind === 'ghost' && styles.btnGhost, (pressed || disabled) && { opacity: disabled ? 0.5 : 0.85 }, style]}>
      {icon}
      <Text style={[styles.btnText, kind === 'primary' && { color: Colors.accentInk }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityState={{ selected }} style={[styles.chip, selected && styles.chipOn]}>
      <Text style={[styles.chipText, selected && { color: Colors.accentInk }]}>{label}</Text>
    </Pressable>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function Field({ label, ...rest }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T variant="label" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>{label}</T>
      <TextInput placeholderTextColor={Colors.muted} {...rest} style={[styles.input, rest.multiline && { minHeight: 96, textAlignVertical: 'top' }, rest.style]} />
    </View>
  );
}

/** Segmented control: one choice out of a few. */
export function Segmented<V extends string | number>({ options, value, onChange }: { options: { value: V; label: string }[]; value?: V; onChange: (v: V) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[styles.segItem, value === o.value && styles.segOn]} accessibilityState={{ selected: value === o.value }}>
          <Text style={[styles.segText, value === o.value && { color: Colors.ink }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const styles = StyleSheet.create({
  title: { fontSize: 34, fontWeight: '800', color: Colors.ink, letterSpacing: -1 },
  h2: { fontSize: 24, fontWeight: '700', color: Colors.ink, letterSpacing: -0.5 },
  h3: { fontSize: 17, fontWeight: '700', color: Colors.ink },
  body: { fontSize: 15, color: Colors.ink, lineHeight: 21 },
  muted: { fontSize: 13, color: Colors.muted, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  num: { fontFamily: Fonts.mono, fontSize: 13, color: Colors.ink },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 18, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.surface },
  btnPrimary: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  btnGhost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  btnText: { fontSize: 15, fontWeight: '600', color: Colors.ink },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.line },
  chipOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.ink },
  panel: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.line, padding: Spacing.lg, gap: Spacing.md },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.ink },
  seg: { flexDirection: 'row', backgroundColor: Colors.surface2, borderRadius: 16, padding: 4, gap: 4 },
  segItem: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  segOn: { backgroundColor: Colors.surface },
  segText: { fontSize: 14, fontWeight: '600', color: Colors.muted },
});
