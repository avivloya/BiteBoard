import AsyncStorage from '@react-native-async-storage/async-storage';

import FAQ from '@/data/bitey-faq.json';

import { aiConfigured, askBitey } from './ai';

// Bitey, the helper in the Inbox. With the AI backend it answers anything about the app;
// without it, it answers from the same notes the AI uses (src/data/bitey-faq.json).
export type BiteyMsg = { from: 'me' | 'bitey'; text: string; at: number };
const KEY = 'biteboard:bitey';

export const loadBitey = async (): Promise<BiteyMsg[]> => {
  try { return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]'); } catch { return []; }
};
const save = (c: BiteyMsg[]) => AsyncStorage.setItem(KEY, JSON.stringify(c.slice(-60))).catch(() => {});

export function biteyLocal(q: string) {
  const t = q.toLowerCase();
  let best: (typeof FAQ)[number] | null = null, score = 0;
  for (const x of FAQ) {
    const n = x.k.reduce((sum, k) => sum + (t.includes(k) ? k.length : 0), 0);
    if (n > score) { score = n; best = x; }
  }
  return best?.a ?? 'I can help with snapping meals, filming and editing videos, recipes, boards, followers, messages, verification and settings. What would you like to do?';
}

export async function ask(chat: BiteyMsg[], q: string): Promise<BiteyMsg[]> {
  const withQ = [...chat, { from: 'me' as const, text: q, at: Date.now() }];
  save(withQ);
  let a = '';
  if (aiConfigured) {
    try {
      a = (await askBitey(withQ.slice(-12).map((m) => ({ role: m.from === 'me' ? 'user' as const : 'assistant' as const, content: m.text })))).text;
    } catch { a = ''; }
  }
  const out = [...withQ, { from: 'bitey' as const, text: a || biteyLocal(q), at: Date.now() }];
  save(out);
  return out;
}
