import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, I18nManager } from 'react-native';
import { create } from 'zustand';

import strings from '@/i18n/strings.json';

/** The app is written in English. Text is looked up in strings.json and swapped for the chosen language;
 * numbers and @names inside a sentence are kept. Shared with the website, which uses the same table. */
export const LANGS = [
  { v: 'en', label: 'English' },
  { v: 'he', label: 'עברית' },
  { v: 'zh', label: '中文' },
  { v: 'es', label: 'Español' },
  { v: 'ru', label: 'Русский' },
] as const;
export type Lang = (typeof LANGS)[number]['v'];

const TABLE = strings as Record<string, Record<string, string>>;
const KEY = 'biteboard:lang';
const deviceLang = (): Lang => {
  const l = (Intl.DateTimeFormat().resolvedOptions().locale || 'en').slice(0, 2).toLowerCase();
  const v = l === 'iw' ? 'he' : l;
  return LANGS.some((x) => x.v === v) ? (v as Lang) : 'en';
};

export const useLang = create<{ lang: Lang; set: (l: Lang) => void }>()((set) => ({
  lang: deviceLang(),
  set: (lang) => {
    set({ lang });
    AsyncStorage.setItem(KEY, lang).catch(() => {});
    // Hebrew reads right to left. The layout flips the next time the app opens.
    const rtl = lang === 'he';
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
      Alert.alert(tr('Restart Snapspoon'), tr('Close and reopen the app to finish switching the layout.'));
    }
  },
}));
AsyncStorage.getItem(KEY).then((l) => { if (l && LANGS.some((x) => x.v === l)) useLang.setState({ lang: l as Lang }); }).catch(() => {});

/** Translates one piece of English text into the chosen language, or returns it unchanged. */
export function tr(text: string, lang: Lang = useLang.getState().lang): string {
  if (lang === 'en' || !text) return text;
  const table = TABLE[lang];
  if (!table) return text;
  const core = text.trim();
  if (!core) return text;
  let v = table[core];
  if (v === undefined) {
    const keep: string[] = [];
    const k = core.replace(/@[\w.]+|\d+(?:[.,:]\d+)*/g, (m) => { keep.push(m); return m[0] === '@' ? '{h}' : '{n}'; });
    const f = table[k];
    if (f === undefined) return core.includes(' · ') ? text.replace(core, core.split(' · ').map((x) => tr(x, lang)).join(' · ')) : text;
    let i = 0;
    v = f.replace(/\{[nh]\}/g, () => keep[i++] ?? '');
  }
  return text.replace(core, v);
}

/** Re-renders when the language changes and returns the translate function. */
export function useTr() {
  const lang = useLang((s) => s.lang);
  return (t: string) => tr(t, lang);
}

// Pop-up messages go through the same table.
const alert0 = Alert.alert.bind(Alert);
Alert.alert = (title, message, buttons, options) =>
  alert0(tr(title ?? ""), message ? tr(message) : message, buttons?.map((b) => ({ ...b, text: b.text ? tr(b.text) : b.text })), options);
