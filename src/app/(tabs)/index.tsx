import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Logo } from '@/components/logo';
import { Masonry } from '@/components/recipe-card';
import { Row, Screen } from '@/components/screen';
import { Button, Chip, T, styles as ui } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { FILTERS, LIBRARY } from '@/data/recipes';
import { useStore } from '@/lib/store';

export default function Discover() {
  const mine = useStore((s) => s.mine);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...mine, ...LIBRARY].filter(
      (r) => (filter === 'All' || r.tags.includes(filter) || r.cat === filter) &&
        (!term || `${r.title} ${r.ing.join(' ')} ${r.tags.join(' ')}`.toLowerCase().includes(term)),
    );
  }, [mine, q, filter]);

  return (
    <Screen style={{ gap: 14 }}>
      <Row>
        <Logo />
        <T style={{ fontSize: 22, fontWeight: '800', color: Colors.ink, letterSpacing: -0.6 }}>Biteboard</T>
      </Row>
      <Row style={{ flexWrap: 'nowrap' }}>
        <TextInput value={q} onChangeText={setQ} placeholder="Search healthy recipes" placeholderTextColor={Colors.muted} returnKeyType="search"
          style={[ui.input, { flex: 1, borderRadius: 999, backgroundColor: 'rgba(248,239,226,0.7)', borderColor: 'transparent' }]} />
        <Button title="AI" kind="primary" onPress={() => router.push('/ai-recipe')} />
        <Button title="+" onPress={() => router.push('/write-recipe')} />
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((f) => <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />)}
      </ScrollView>
      {list.length ? <Masonry recipes={list} /> : (
        <View style={{ padding: 28, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.line, alignItems: 'center', gap: 6 }}>
          <T variant="h3">No recipes match</T>
          <T variant="muted">Try another filter, or ask AI to create one for you.</T>
        </View>
      )}
    </Screen>
  );
}
