import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { create } from 'zustand';

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
  Purchases.configure({ apiKey });
  Purchases.addCustomerInfoUpdateListener(apply);
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
