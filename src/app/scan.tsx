import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Row, Screen } from '@/components/screen';
import { Button, Field, Panel, Segmented, T } from '@/components/ui';
import { Colors, Radius } from '@/constants/theme';
import { type Product, lookupBarcode } from '@/lib/barcode';
import { guessMeal } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { MEALS, type Meal } from '@/lib/types';

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const addEntry = useStore((s) => s.addEntry);
  const [product, setProduct] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [grams, setGrams] = useState('100');
  const [meal, setMeal] = useState<Meal>(guessMeal());
  const lastCode = useRef('');

  const onScan = async (code: string) => {
    if (busy || product || code === lastCode.current) return;
    lastCode.current = code;
    setBusy(true); setError('');
    try {
      const p = await lookupBarcode(code);
      if (!p) setError("We couldn't find nutrition info for that barcode. Try another product or quick-add it on Today.");
      else { setProduct(p); setGrams(String(p.servingGrams ?? 100)); }
    } catch {
      setError('Could not look up that product. Check your connection and try again.');
    }
    setBusy(false);
  };

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <Screen edges={[]} bg={Colors.surface}>
        <T variant="h2">Scan a barcode</T>
        <T variant="muted">Biteboard needs the camera to read barcodes on packaged food.</T>
        <Button title="Allow camera" kind="primary" onPress={requestPermission} />
      </Screen>
    );
  }

  const g = Number(grams) || 0;
  const x = product ? { kcal: (product.per100.kcal * g) / 100, p: (product.per100.p * g) / 100, c: (product.per100.c * g) / 100, f: (product.per100.f * g) / 100 } : null;

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Scan a barcode</T>
      {!product && (
        <View style={styles.camera}>
          <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={({ data }) => onScan(data)} />
          <View style={styles.frame} />
          {busy && <ActivityIndicator color={Colors.accentInk} size="large" />}
        </View>
      )}
      {!product && <T variant="muted">Point the camera at the barcode on the package.</T>}
      {!!error && (
        <View style={{ gap: 8 }}>
          <T style={{ color: Colors.warn }}>{error}</T>
          <Button title="Scan again" onPress={() => { setError(''); lastCode.current = ''; }} />
        </View>
      )}
      {product && x && (
        <Panel>
          <T variant="h3">{product.name}</T>
          {!!product.brand && <T variant="muted">{product.brand}</T>}
          <T variant="muted">Per 100 g: {Math.round(product.per100.kcal)} kcal · {Math.round(product.per100.p)}P {Math.round(product.per100.c)}C {Math.round(product.per100.f)}F</T>
          <Field label={`How much did you eat? (grams${product.servingGrams ? `, 1 serving is ${product.servingGrams} g` : ''})`} value={grams} onChangeText={setGrams} keyboardType="decimal-pad" />
          <T variant="num" style={{ fontSize: 16 }}>{Math.round(x.kcal)} kcal · {Math.round(x.p)}P {Math.round(x.c)}C {Math.round(x.f)}F</T>
          <Segmented value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m, label: m }))} />
          <Row style={{ flexWrap: 'nowrap' }}>
            <Button title="Scan another" onPress={() => { setProduct(null); lastCode.current = ''; }} />
            <Button title={`Add ${Math.round(x.kcal)} kcal`} kind="primary" disabled={!g} style={{ flex: 1 }} onPress={() => {
              addEntry({ name: product.brand ? `${product.name} (${product.brand})` : product.name, ...x, meal, src: 'barcode' });
              router.back();
            }} />
          </Row>
          <T variant="muted" style={{ fontSize: 11 }}>Nutrition data from Open Food Facts.</T>
        </Panel>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  camera: { height: 340, borderRadius: Radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  frame: { width: '75%', height: 120, borderWidth: 3, borderColor: Colors.accentInk, borderRadius: 16, position: 'absolute' },
});
