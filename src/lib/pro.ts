import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { create } from 'zustand';

import { supabase } from './social';

// RevenueCat handles App Store and Google Play subscriptions. "pro" is the entitlement id set up in RevenueCat.
const ENTITLEMENT = 'pro';
// The Verified plan ($10/month) is its own entitlement and offering, both named "verified" in RevenueCat.
const VERIFIED = 'verified';
const apiKey = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
export const proConfigured = !!apiKey;

type ProState = { isPro: boolean; packages: PurchasesPackage[]; ready: boolean; verifiedPlan: boolean; verifiedPackage: PurchasesPackage | null };
export const usePro = create<ProState>()(() => ({ isPro: false, packages: [], ready: false, verifiedPlan: false, verifiedPackage: null }));

const apply = (info: CustomerInfo) => usePro.setState({ isPro: !!info.entitlements.active[ENTITLEMENT], verifiedPlan: !!info.entitlements.active[VERIFIED] });

let started = false;
export async function initPro() {
  if (!apiKey || started) return;
  started = true;
  // RevenueCat knows each buyer by their Snapspoon account id, so Pro follows the account to a new phone
  // and the AI server can check it (supabase/functions/ai).
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  Purchases.configure({ apiKey, appUserID: session?.user.id ?? null });
  Purchases.addCustomerInfoUpdateListener(apply);
  let current = session?.user.id;
  supabase?.auth.onAuthStateChange((_event, s) => {
    const id = s?.user.id;
    if (!id || id === current) return;
    current = id;
    Purchases.logIn(id).then(({ customerInfo }) => apply(customerInfo)).catch(() => {});
  });
  try {
    const [info, offerings] = await Promise.all([Purchases.getCustomerInfo(), Purchases.getOfferings()]);
    apply(info);
    usePro.setState({ packages: offerings.current?.availablePackages ?? [], verifiedPackage: offerings.all[VERIFIED]?.monthly ?? offerings.all[VERIFIED]?.availablePackages[0] ?? null });
  } finally {
    usePro.setState({ ready: true });
  }
}

/** Returns true when the purchase went through; false when the user cancelled. */
export async function buy(pkg: PurchasesPackage) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    apply(customerInfo);
    return true;
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return false;
    throw e;
  }
}

export async function restore() {
  const info = await Purchases.restorePurchases();
  apply(info);
  return !!info.entitlements.active[ENTITLEMENT];
}
