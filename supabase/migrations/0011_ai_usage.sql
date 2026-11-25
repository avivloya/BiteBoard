-- Weekly AI uses per account, counted by the AI function (supabase/functions/ai) so the free limit can't be skipped.
-- Only the function (service role) reads or writes this table. Weeks start on Monday (UTC).
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  week date not null,
  scans int not null default 0,
  recipes int not null default 0,
  fixes int not null default 0,
  bitey int not null default 0,
  primary key (user_id, week)
);
alter table public.ai_usage enable row level security;

-- Adds one use of `kind` this week if the account is under `lim`. Returns true when the use is allowed.
create or replace function public.use_ai(uid uuid, kind text, lim int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  wk date := date_trunc('week', now() at time zone 'utc')::date;
  used int;
begin
  if kind not in ('scans', 'recipes', 'fixes', 'bitey') then raise exception 'unknown kind %', kind; end if;
  insert into public.ai_usage (user_id, week) values (uid, wk) on conflict do nothing;
  execute format('update public.ai_usage set %1$I = %1$I + 1 where user_id = $1 and week = $2 and %1$I < $3 returning %1$I', kind)
    into used using uid, wk, lim;
  return used is not null;
end $$;

revoke all on function public.use_ai(uuid, text, int) from public, anon, authenticated;
grant execute on function public.use_ai(uuid, text, int) to service_role;

-- How many AI uses you have left is shown in the app from this (your own rows only).
create policy "read own ai usage" on public.ai_usage for select to authenticated using (user_id = auth.uid());
