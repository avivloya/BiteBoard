-- Live camera guesses get their own weekly count, so they don't use up photo scans.
alter table public.ai_usage add column if not exists live int not null default 0;

create or replace function public.use_ai(uid uuid, kind text, lim int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  wk date := date_trunc('week', now() at time zone 'utc')::date;
  used int;
begin
  if kind not in ('scans', 'recipes', 'fixes', 'bitey', 'live') then raise exception 'unknown kind %', kind; end if;
  insert into public.ai_usage (user_id, week) values (uid, wk) on conflict do nothing;
  execute format('update public.ai_usage set %1$I = %1$I + 1 where user_id = $1 and week = $2 and %1$I < $3 returning %1$I', kind)
    into used using uid, wk, lim;
  return used is not null;
end $$;

revoke all on function public.use_ai(uuid, text, int) from public, anon, authenticated;
grant execute on function public.use_ai(uuid, text, int) to service_role;
