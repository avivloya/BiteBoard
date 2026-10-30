import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BiteyAvatar } from '@/components/bitey-avatar';
import { Row } from '@/components/screen';
import { Button, Chip, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { ask, type BiteyMsg, loadBitey } from '@/lib/bitey';
import { tr } from '@/lib/i18n';

const STARTERS = ['How do I add music?', 'How do I log a meal?', 'How do I get verified?', 'How do I block someone?'];
const HELLO: BiteyMsg = { from: 'bitey', text: "Hi! I'm Bitey 🍳 Ask me anything about Snapspoon, like how to edit a video, log a meal, or get verified.", at: 0 };

/** Bitey, Snapspoon's built-in helper, in the Inbox. */
export default function Bitey() {
  const [chat, setChat] = useState<BiteyMsg[]>([]);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const ref = useRef<FlatList<BiteyMsg>>(null);
  useEffect(() => { loadBitey().then(setChat); }, []);

  const send = async (q: string) => {
    const t = q.trim();
    if (!t || thinking) return;
    setText('');
    setChat((c) => [...c, { from: 'me', text: t, at: Date.now() }]);
    setThinking(true);
    setChat(await ask(chat, t));
    setThinking(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={['top', 'bottom']}>
      <Row style={{ paddingHorizontal: 16, paddingVertical: 10, flexWrap: 'nowrap' }}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back"><T style={{ fontSize: 22 }}>←</T></Pressable>
        <BiteyAvatar size={36} />
        <View><T style={{ fontWeight: '700' }}>Bitey</T><T variant="muted" style={{ fontSize: 12 }}>Your Snapspoon helper</T></View>
      </Row>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList ref={ref} data={[HELLO, ...chat, ...(thinking ? [{ from: 'bitey' as const, text: '…', at: -1 }] : [])]} keyExtractor={(m, i) => `${m.at}-${i}`}
          contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1, justifyContent: 'flex-end' }}
          onContentSizeChange={() => ref.current?.scrollToEnd({ animated: true })}
          renderItem={({ item: m }) => (
            <View style={[s.bubble, m.from === 'me' ? s.me : s.them]}>
              <T style={{ color: m.from === 'me' ? Colors.accentInk : Colors.ink }}>{m.text}</T>
            </View>
          )} />
        {!chat.length && (
          <Row style={{ paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
            {STARTERS.map((q) => <Chip key={q} label={q} onPress={() => send(tr(q))} />)}
          </Row>
        )}
        <Row style={{ paddingHorizontal: 16, paddingBottom: 8, flexWrap: 'nowrap' }}>
          <TextInput value={text} onChangeText={setText} placeholder={tr('Ask Bitey…')} placeholderTextColor={Colors.muted} maxLength={500} onSubmitEditing={() => send(text)} returnKeyType="send" style={s.input} />
          <Button title="Send" kind="primary" disabled={!text.trim() || thinking} onPress={() => send(text)} />
        </Row>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  me: { alignSelf: 'flex-end', backgroundColor: Colors.accent, borderBottomRightRadius: 6 },
  them: { alignSelf: 'flex-start', backgroundColor: Colors.surface, borderBottomLeftRadius: 6 },
  input: { flex: 1, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: Colors.ink },
});
