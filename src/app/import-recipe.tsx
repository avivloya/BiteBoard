import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, Field, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { aiConfigured, importRecipe } from '@/lib/ai';
import { usePro } from '@/lib/pro';
import { aiLeft, useStore } from '@/lib/store';

/** Paste a recipe link (blog, TikTok, Instagram, YouTube) or the recipe text, and get it as a Snapspoon recipe with macros. */
export default function ImportRecipe() {
  const { addRecipe, countAiUse } = useStore();
  const isPro = usePro((s) => s.isPro);
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const go = async () => {
    if (!isPro && aiLeft('recipes') <= 0) return router.push('/pro');
    setBusy(true); setError('');
    try {
      const r = await importRecipe(source.trim());
      if (!isPro) countAiUse('recipes');
      const id = addRecipe({ ...r, ai: true, caption: /^https?:\/\//.test(source.trim()) ? `From ${source.trim()}` : undefined });
      router.replace({ pathname: '/recipe/[id]', params: { id } });
    } catch (e) { setError(e instanceof Error ? e.message : 'That did not work. Try again.'); setBusy(false); }
  };

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Import a recipe</T>
      <T variant="muted">Paste a link from a recipe site, TikTok, Instagram or YouTube, or paste the recipe itself. Snapspoon works out the calories and macros.</T>
      <Field label="Link or recipe" value={source} onChangeText={setSource} placeholder="https://www.tiktok.com/@chef/video/..." multiline autoCapitalize="none" />
      <Button title={busy ? 'Reading the recipe…' : 'Import'} kind="primary" disabled={busy || !source.trim() || !aiConfigured} onPress={go}
        icon={busy ? <ActivityIndicator color={Colors.accentInk} /> : undefined} />
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      <T variant="muted" style={{ fontSize: 12 }}>Tip: for TikTok and Instagram, the caption often has the full recipe. If the link doesn't work, paste the caption.</T>
    </Screen>
  );
}
