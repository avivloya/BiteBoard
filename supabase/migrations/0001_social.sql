-- Public profiles, friendships and shared recipes for Biteboard.
-- Private data (weight, food log) stays on the device and is never stored here.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text not null unique check (handle ~ '^[A-Za-z0-9_.]{3,20}$'),
  name text not null,
  bio text not null default '',
  streak int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.shared_recipes (
  id text primary key,
  owner uuid not null references public.profiles on delete cascade,
  recipe jsonb not null,
  created_at timestamptz not null default now()
);

create table public.friendships (
  user_id uuid not null references public.profiles on delete cascade,
  friend_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

alter table public.profiles enable row level security;
alter table public.shared_recipes enable row level security;
alter table public.friendships enable row level security;

-- Profiles and shared recipes are public to signed-in users; only the owner can write.
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "own profile delete" on public.profiles for delete to authenticated using (id = auth.uid());

create policy "recipes readable" on public.shared_recipes for select to authenticated using (true);
create policy "own recipes write" on public.shared_recipes for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- You see and manage your own friend list.
create policy "own friendships" on public.friendships for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
