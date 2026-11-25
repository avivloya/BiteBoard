import { supabase } from './social';
import { useStore } from './store';

// Cloud backup: once you sign in with Apple or Google, your food log, weigh-ins, targets, boards and own recipes
// are copied to your account (table user_data), so they come back when you sign in on a new phone.
// Guest accounts aren't backed up, because a guest can't sign back in to get them.

const KEYS = ['profile', 'targets', 'boards', 'mine', 'days', 'weights', 'reminders', 'water'] as const;
type Backup = Partial<Pick<ReturnType<typeof useStore.getState>, (typeof KEYS)[number]>>;

const snapshot = (): Backup => {
  const s = useStore.getState();
  return Object.fromEntries(KEYS.map((k) => [k, s[k]])) as Backup;
};

/** The signed-in (not guest) account's id, or null. */
async function accountId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  return user && !user.is_anonymous ? user.id : null;
}

export async function uploadBackup() {
  const id = await accountId();
  if (!id || !supabase || !useStore.getState().profile) return;
  await supabase.from('user_data').upsert({ user_id: id, data: snapshot(), updated_at: new Date().toISOString() });
}

/** Puts this account's backup on the phone. Returns false when the account has no backup yet. */
export async function restoreBackup() {
  const id = await accountId();
  if (!id || !supabase) return false;
  const { data } = await supabase.from('user_data').select('data').eq('user_id', id).maybeSingle();
  const saved = data?.data as Backup | undefined;
  if (!saved?.profile) return false;
  useStore.setState(Object.fromEntries(KEYS.filter((k) => saved[k] !== undefined).map((k) => [k, saved[k]])));
  return true;
}

/** Backs up a few seconds after anything changes. Returns a function that stops it. */
export function startBackup() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsub = useStore.subscribe((s, prev) => {
    if (KEYS.every((k) => s[k] === prev[k])) return;
    clearTimeout(timer);
    timer = setTimeout(() => uploadBackup().catch(() => {}), 4000);
  });
  uploadBackup().catch(() => {});
  return () => { clearTimeout(timer); unsub(); };
}
