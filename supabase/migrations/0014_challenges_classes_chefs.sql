-- Group challenges with leaderboards, live cooking classes, and healthy chef profiles.

-- Challenges: anyone signed in can start one; everyone can see them.
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 60),
  about text not null default '' check (char_length(about) <= 300),
  days int not null default 30 check (days between 3 and 100),
  starts_on date not null default current_date,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.challenges enable row level security;
create policy "challenges are public" on public.challenges for select using (true);
create policy "start a challenge" on public.challenges for insert to authenticated with check (created_by = auth.uid());
create policy "creator can delete" on public.challenges for delete to authenticated using (created_by = auth.uid());

create table if not exists public.challenge_members (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
alter table public.challenge_members enable row level security;
create policy "members are public" on public.challenge_members for select using (true);
create policy "join yourself" on public.challenge_members for insert to authenticated with check (user_id = auth.uid());
create policy "leave yourself" on public.challenge_members for delete to authenticated using (user_id = auth.uid());

-- One check-in per person per day. The leaderboard counts them.
create table if not exists public.challenge_checkins (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day date not null default current_date,
  primary key (challenge_id, user_id, day),
  foreign key (challenge_id, user_id) references public.challenge_members (challenge_id, user_id) on delete cascade
);
alter table public.challenge_checkins enable row level security;
create policy "check-ins are public" on public.challenge_checkins for select using (true);
create policy "check in yourself" on public.challenge_checkins for insert to authenticated
  with check (user_id = auth.uid() and day between current_date - 1 and current_date + 1);
create policy "undo your check-in" on public.challenge_checkins for delete to authenticated using (user_id = auth.uid());

-- Official starter challenges.
insert into public.challenges (title, about, days, created_by) values
  ('30 days, no soda', 'Swap soda for water, tea or sparkling water. Check in every day you skip it.', 30, null),
  ('Protein at breakfast', 'Get 25 g of protein before 10am for two weeks.', 14, null),
  ('Log every meal', 'Snap or log every meal for 21 days in a row.', 21, null),
  ('10k steps a day', 'Walk 10,000 steps a day for a month.', 30, null)
on conflict do nothing;

-- Healthy chef profiles: like the verified badge, only Snapspoon can turn this on.
alter table public.profiles add column if not exists chef boolean not null default false;
alter table public.profiles add column if not exists specialty text not null default '' check (char_length(specialty) <= 60);

create or replace function public.keep_chef() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.chef := coalesce(case when tg_op = 'UPDATE' then old.chef end, false);
  end if;
  return new;
end $$;
drop trigger if exists profiles_keep_chef on public.profiles;
create trigger profiles_keep_chef before insert or update on public.profiles
  for each row execute function public.keep_chef();

-- Live cooking classes. Verified accounts and chefs can host; the class itself runs on a link
-- (Instagram Live, YouTube Live, Zoom...). Everyone can see the schedule and save a spot.
create table if not exists public.cooking_classes (
  id uuid primary key default gen_random_uuid(),
  host uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  about text not null default '' check (char_length(about) <= 500),
  starts_at timestamptz not null,
  minutes int not null default 45 check (minutes between 10 and 240),
  link text not null check (link ~ '^https://'),
  created_at timestamptz not null default now()
);
alter table public.cooking_classes enable row level security;
create policy "classes are public" on public.cooking_classes for select using (true);
create policy "verified hosts add classes" on public.cooking_classes for insert to authenticated
  with check (host = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and (p.verified or p.chef)));
create policy "hosts remove their classes" on public.cooking_classes for delete to authenticated using (host = auth.uid());

create table if not exists public.class_rsvps (
  class_id uuid not null references public.cooking_classes (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
alter table public.class_rsvps enable row level security;
create policy "rsvps are public" on public.class_rsvps for select using (true);
create policy "rsvp yourself" on public.class_rsvps for insert to authenticated with check (user_id = auth.uid());
create policy "cancel your rsvp" on public.class_rsvps for delete to authenticated using (user_id = auth.uid());
