// Snapspoon push notifications (Supabase Edge Function, Deno).
// A Database Webhook calls this on every new like, comment, follow and message.
// It works out who should hear about it and sends the push through Expo.
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set for edge functions automatically;
// set WEBHOOK_SECRET yourself and add it as an "x-webhook-secret" header on each webhook.
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const SECRET = Deno.env.get('WEBHOOK_SECRET');

type Row = Record<string, string | null>;
const ownerOf = (postId: string) => postId.split(':')[0];
const clip = (s: string, n = 80) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

async function handle(uid: string) {
  const { data } = await db.from('profiles').select('handle').eq('id', uid).maybeSingle();
  return data?.handle ? `@${data.handle}` : 'Someone';
}

/** Who gets told, what it says, and where tapping it goes. */
async function plan(table: string, r: Row): Promise<{ to: string; from: string; body: string; url: string } | null> {
  if (table === 'post_likes') return { to: ownerOf(r.post_id!), from: r.user_id!, body: 'liked your video.', url: '/activity' };
  if (table === 'friendships') return { to: r.friend_id!, from: r.user_id!, body: 'started following you.', url: `/person/${r.user_id}` };
  if (table === 'messages') return { to: r.recipient!, from: r.sender!, body: r.body ? clip(r.body) : 'sent you a video.', url: `/chat/${r.sender}` };
  if (table === 'post_comments') {
    if (r.parent_id) {
      const { data } = await db.from('post_comments').select('user_id').eq('id', r.parent_id).maybeSingle();
      if (data?.user_id) return { to: data.user_id, from: r.user_id!, body: `replied: ${clip(r.body ?? '')}`, url: '/activity' };
    }
    return { to: ownerOf(r.post_id!), from: r.user_id!, body: `commented: ${clip(r.body ?? '')}`, url: '/activity' };
  }
  return null;
}

Deno.serve(async (req) => {
  if (SECRET && req.headers.get('x-webhook-secret') !== SECRET) return new Response('no', { status: 401 });
  const { type, table, record } = await req.json();
  if (type !== 'INSERT' || !record) return new Response('skip');
  const p = await plan(table, record);
  if (!p || p.to === p.from) return new Response('skip');
  const { data: blocked } = await db.rpc('blocked_between', { a: p.to, b: p.from });
  if (blocked) return new Response('blocked');
  const { data: tokens } = await db.from('push_tokens').select('token').eq('user_id', p.to).eq('enabled', true);
  if (!tokens?.length) return new Response('no tokens');
  const body = `${table === 'messages' ? `${await handle(p.from)}: ` : `${await handle(p.from)} `}${p.body}`;
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(tokens.map((t) => ({ to: t.token, title: 'Snapspoon', body, sound: 'default', data: { url: p.url } }))),
  });
  // Forget phones that uninstalled the app.
  const out = await res.json().catch(() => null);
  const dead = (out?.data ?? []).map((d: { details?: { error?: string } }, i: number) => (d?.details?.error === 'DeviceNotRegistered' ? tokens[i].token : null)).filter(Boolean);
  if (dead.length) await db.from('push_tokens').delete().in('token', dead);
  return new Response('sent');
});
