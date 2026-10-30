import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Button, Chip, Field, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { aiConfigured, draftRecipe } from '@/lib/ai';
import { usePro } from '@/lib/pro';
import { aiLeft, useStore } from '@/lib/store';

const IDEAS = ['Under 400 kcal breakfast with eggs', 'Sweet snack under 200 kcal', 'Meal-prep chicken lunch, 40 g protein'];

export default function AiRecipe() {
  const addRecipe = useStore((s) => s.addRecipe);
  const countAiUse = useStore((s) => s.countAiUse);
  const isPro = usePro((s) => s.isPro);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const go = async () => {
    if (!isPro && aiLeft('recipes') <= 0) return router.push('/pro');
    setBusy(true); setError('');
    try {
      const r = await draftRecipe(prompt.trim());
      if (!isPro) countAiUse('recipes');
      const tags = r.kcal < 400 && !r.tags.includes('Under 400') ? [...r.tags, 'Under 400'] : r.tags;
      const id = addRecipe({ ...r, tags, ai: true });
      router.replace({ pathname: '/recipe/[id]', params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The recipe did not come back. Try again.');
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Create a recipe with AI</T>
      <T variant="muted">Describe what you want and AI writes a healthy recipe with calories and macros per serving.</T>
      <Field label="What should it be?" value={prompt} onChangeText={setPrompt} multiline placeholder="High-protein vegetarian dinner under 500 kcal with chickpeas" />
      <Row>{IDEAS.map((x) => <Chip key={x} label={x} onPress={() => setPrompt(x)} />)}</Row>
      {!isPro && <T variant="muted">{aiLeft('recipes')} free AI recipes left this week.</T>}
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      {!aiConfigured && <T variant="muted">AI recipes need the AI backend. See the README to set EXPO_PUBLIC_AI_URL.</T>}
      <Button title={busy ? 'Writing your recipe…' : 'Create recipe'} kind="primary" disabled={busy || !prompt.trim() || !aiConfigured} onPress={go}
        icon={busy ? <ActivityIndicator color={Colors.accentInk} /> : undefined} />
    </Screen>
  );
}
