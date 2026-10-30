import { Row } from '@/components/screen';
import { Chip } from '@/components/ui';
import { LANGS, useLang } from '@/lib/i18n';

/** English, Hebrew, Chinese, Spanish or Russian. Each language is shown in its own words. */
export function LangPicker() {
  const { lang, set } = useLang();
  return <Row style={{ gap: 8 }}>{LANGS.map((l) => <Chip key={l.v} label={l.label} selected={lang === l.v} onPress={() => set(l.v)} />)}</Row>;
}
