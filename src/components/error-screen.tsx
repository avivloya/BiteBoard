import { useEffect } from 'react';
import { View } from 'react-native';

import { Button, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { reportError } from '@/lib/crash';

/** Shown instead of a blank screen when a page breaks. The error is reported, and Try again reloads the page. */
export function ErrorScreen({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  useEffect(() => { reportError(error, { screen: 'error-boundary' }); }, [error]);
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, padding: 28, justifyContent: 'center', gap: 14 }}>
      <T variant="h2">Something went wrong</T>
      <T variant="muted">Sorry about that. We've been told about it automatically. Try again, and if it keeps happening, restart the app.</T>
      <Button title="Try again" kind="primary" onPress={retry} />
    </View>
  );
}
