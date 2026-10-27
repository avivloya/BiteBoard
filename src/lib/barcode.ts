// Packaged food lookup from Open Food Facts (free, no API key). Values are per 100 g.
export type Product = {
  code: string;
  name: string;
  brand: string;
  servingGrams: number | null;
  per100: { kcal: number; p: number; c: number; f: number };
};

export async function lookupBarcode(code: string): Promise<Product | null> {
  const fields = 'product_name,brands,serving_quantity,nutriments';
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`, {
    headers: { 'User-Agent': 'Biteboard/1.0 (mobile app)' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const p = data.product;
  const n = p.nutriments ?? {};
  const kcal = Number(n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : NaN));
  if (!Number.isFinite(kcal)) return null;
  return {
    code,
    name: p.product_name || 'Unnamed product',
    brand: String(p.brands ?? '').split(',')[0].trim(),
    servingGrams: Number(p.serving_quantity) || null,
    per100: { kcal, p: Number(n.proteins_100g) || 0, c: Number(n.carbohydrates_100g) || 0, f: Number(n.fat_100g) || 0 },
  };
}
