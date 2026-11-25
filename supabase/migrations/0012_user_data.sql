-- Cloud backup of the app's private data (food log, weigh-ins, targets, boards, own recipes, water).
-- One row per account, readable and writable only by its owner. Deleting the account deletes it.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;

create policy "read own data" on public.user_data for select to authenticated using (user_id = auth.uid());
create policy "add own data" on public.user_data for insert to authenticated with check (user_id = auth.uid());
create policy "change own data" on public.user_data for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
