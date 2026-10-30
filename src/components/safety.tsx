import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { REPORT_REASONS, setBlocked } from '@/lib/social';
import { useSocial } from '@/lib/social-store';

/** A bottom sheet over the screen, like the comments in Watch. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <SafeAreaView edges={['bottom']} style={s.sheet}>
          <View style={s.grab} />
          <T style={{ textAlign: 'center', fontWeight: '700' }}>{title}</T>
          {children}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Option({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={s.option} accessibilityRole="button">
      <T style={{ fontSize: 15, color: danger ? Colors.warn : Colors.ink }}>{label}</T><T variant="muted">›</T>
    </Pressable>
  );
}

export function confirmBlock(id: string, handle: string | undefined, done: () => void) {
  const userId = useSocial.getState().userId;
  if (!userId) return;
  Alert.alert(`Block @${handle ?? ''}?`, "They won't be able to message you, and you won't see their posts or comments. They aren't told.", [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Block', style: 'destructive', onPress: () => setBlocked(userId, id, true).then(done).catch((e) => Alert.alert("Couldn't block", e instanceof Error ? e.message : '')) },
  ]);
}

/** Pick why you're reporting it. Then a thank-you, with the option to block. */
export function ReportSheet({ title, onClose, onPick, blockId, blockHandle }: { title: string; onClose: () => void; onPick: (reason: string) => void; blockId?: string; blockHandle?: string }) {
  const [done, setDone] = useState(false);
  const me = useSocial((st) => st.userId);
  return (
    <Sheet onClose={onClose} title={done ? 'Thanks for telling us' : title}>
      {done ? <T variant="muted">Snapspoon reviews reports within 24 hours.</T> : (
        <>
          <T variant="muted" style={{ textAlign: 'center' }}>Why are you reporting this? Your report is anonymous.</T>
          {REPORT_REASONS.map((r) => <Option key={r} label={r} onPress={() => { onPick(r); setDone(true); }} />)}
        </>
      )}
      {!!blockId && blockId !== me && <Option label={`Block @${blockHandle ?? ''}`} danger onPress={() => confirmBlock(blockId, blockHandle, onClose)} />}
    </Sheet>
  );
}

const s = StyleSheet.create({
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 12 },
  grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.line, alignSelf: 'center' },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
});
