import { clean, blockedReason } from './moderation';
import { ensureSession, profilesByIds, type PublicProfile, sendMessage, supabase } from './social';
import { dayKey } from './dates';

// Group challenges, live cooking classes and healthy chefs (tables in supabase/migrations/0014_*).
const byId = async (ids: string[]) => Object.fromEntries((await profilesByIds(ids)).map((p) => [p.id, p])) as Record<string, PublicProfile>;

const db = () => {
  if (!supabase) throw new Error('This needs the Snapspoon server. Add the Supabase keys to your .env file.');
  return supabase;
};

export type Challenge = { id: string; title: string; about: string; days: number; starts_on: string; created_by: string | null };
export type Standing = { user: PublicProfile; checkins: number; today: boolean };
export type CookingClass = { id: string; host: string; title: string; about: string; starts_at: string; minutes: number; link: string; hostProfile?: PublicProfile; going: number; mine: boolean };

export async function listChallenges() {
  const me = await ensureSession();
  const { data, error } = await db().from('challenges').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  const { data: mine } = await db().from('challenge_members').select('challenge_id').eq('user_id', me);
  const joined = new Set((mine ?? []).map((m) => m.challenge_id as string));
  const { data: counts } = await db().from('challenge_members').select('challenge_id');
  const n: Record<string, number> = {};
  (counts ?? []).forEach((c) => { n[c.challenge_id] = (n[c.challenge_id] ?? 0) + 1; });
  return (data as Challenge[]).map((c) => ({ ...c, joined: joined.has(c.id), members: n[c.id] ?? 0 }));
}

export async function createChallenge(c: { title: string; about: string; days: number }) {
  const why = blockedReason(`${c.title} ${c.about}`);
  if (why) throw new Error(why);
  const me = await ensureSession();
  const { data, error } = await db().from('challenges').insert({ title: clean(c.title), about: clean(c.about), days: c.days, created_by: me }).select().single();
  if (error) throw new Error(error.message);
  await joinChallenge(data.id, true);
  return data as Challenge;
}

export async function joinChallenge(id: string, on: boolean) {
  const me = await ensureSession();
  const q = on ? db().from('challenge_members').insert({ challenge_id: id, user_id: me }) : db().from('challenge_members').delete().eq('challenge_id', id).eq('user_id', me);
  const { error } = await q;
  if (error && error.code !== '23505') throw new Error(error.message);
}

export async function checkIn(id: string, on = true) {
  const me = await ensureSession();
  const day = dayKey();
  const { error } = on
    ? await db().from('challenge_checkins').insert({ challenge_id: id, user_id: me, day })
    : await db().from('challenge_checkins').delete().eq('challenge_id', id).eq('user_id', me).eq('day', day);
  if (error && error.code !== '23505') throw new Error(error.message);
}

/** Members ranked by days checked in. */
export async function leaderboard(id: string): Promise<{ challenge: Challenge; standings: Standing[]; me: string }> {
  const me = await ensureSession();
  const [{ data: c }, { data: members }, { data: checks }] = await Promise.all([
    db().from('challenges').select('*').eq('id', id).single(),
    db().from('challenge_members').select('user_id').eq('challenge_id', id),
    db().from('challenge_checkins').select('user_id, day').eq('challenge_id', id),
  ]);
  const ids = (members ?? []).map((m) => m.user_id as string);
  const people = await byId(ids);
  const today = dayKey();
  const standings = ids.map((uid) => {
    const mine = (checks ?? []).filter((x) => x.user_id === uid);
    return { user: people[uid], checkins: mine.length, today: mine.some((x) => x.day === today) };
  }).filter((s) => s.user).sort((a, b) => b.checkins - a.checkins);
  return { challenge: c as Challenge, standings, me };
}

/** A friendly 🙌 in their messages. */
export async function highFive(to: string, streak?: number) {
  const me = await ensureSession();
  await sendMessage(me, to, streak ? `🙌 High five on your ${streak} day streak! Keep it going.` : '🙌 High five! Keep it up.');
}

export async function listClasses(): Promise<CookingClass[]> {
  const me = await ensureSession();
  const since = new Date(Date.now() - 3 * 3600_000).toISOString();
  const { data, error } = await db().from('cooking_classes').select('*').gte('starts_at', since).order('starts_at').limit(40);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Omit<CookingClass, 'going' | 'mine'>[];
  const { data: rsvps } = rows.length ? await db().from('class_rsvps').select('class_id, user_id').in('class_id', rows.map((r) => r.id)) : { data: [] };
  const hosts = await byId([...new Set(rows.map((r) => r.host))]);
  return rows.map((r) => ({
    ...r,
    hostProfile: hosts[r.host],
    going: (rsvps ?? []).filter((x) => x.class_id === r.id).length,
    mine: (rsvps ?? []).some((x) => x.class_id === r.id && x.user_id === me),
  }));
}

export async function addClass(c: { title: string; about: string; starts_at: string; minutes: number; link: string }) {
  const why = blockedReason(`${c.title} ${c.about}`);
  if (why) throw new Error(why);
  const me = await ensureSession();
  const { error } = await db().from('cooking_classes').insert({ ...c, title: clean(c.title), about: clean(c.about), host: me });
  if (error) throw new Error(error.code === '42501' ? 'Only verified accounts and Snapspoon chefs can host classes.' : error.message);
}

export async function rsvp(id: string, on: boolean) {
  const me = await ensureSession();
  const { error } = on ? await db().from('class_rsvps').insert({ class_id: id, user_id: me }) : await db().from('class_rsvps').delete().eq('class_id', id).eq('user_id', me);
  if (error && error.code !== '23505') throw new Error(error.message);
}

export type Chef = PublicProfile & { chef?: boolean; specialty?: string };

/** Snapspoon chefs first, then other verified creators. */
export async function listChefs(): Promise<Chef[]> {
  const { data, error } = await db().from('profiles').select('*').or('chef.eq.true,verified.eq.true').limit(60);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Chef[]).sort((a, b) => Number(!!b.chef) - Number(!!a.chef));
}
