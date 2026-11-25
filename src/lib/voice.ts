import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useRef, useState } from 'react';

/**
 * Talk-to-text with the phone's own speech recognition (works on iPhone, Android and Chrome/Safari).
 * `continuous` keeps listening (for hands-free cooking); otherwise it stops after one sentence.
 * `onFinal` gets each finished sentence.
 */
export function useVoice({ continuous = false, onFinal }: { continuous?: boolean; onFinal?: (text: string) => void } = {}) {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const final = useRef(onFinal);
  final.current = onFinal;

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (e) => {
    const said = e.results[0]?.transcript ?? '';
    setText(said);
    if (e.isFinal && said.trim()) final.current?.(said.trim());
  });
  useSpeechRecognitionEvent('error', (e) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    setError(e.error === 'not-allowed' ? 'Allow the microphone and speech recognition for Snapspoon in Settings.' : 'Voice did not work. Try again or type it.');
  });

  const start = useCallback(async () => {
    setError(''); setText('');
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) return setError('Allow the microphone and speech recognition for Snapspoon in Settings.');
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous, addsPunctuation: true });
    } catch {
      setError('Voice needs the latest Snapspoon app build. You can type instead.');
    }
  }, [continuous]);
  const stop = useCallback(() => { try { ExpoSpeechRecognitionModule.stop(); } catch {} }, []);

  return { listening, text, setText, error, start, stop };
}
