-- Likes, comments and direct messages.
-- A post is named "{owner id}:{recipe id}", the same way the website names it.
-- Everything is removed with the person's account (on delete cascade).

create table if not exists public.post_likes (
  post_id text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
create policy "likes readable" on public.post_likes for select to authenticated using (true);
create policy "like as yourself" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy "unlike your own" on public.post_likes for delete to authenticated using (user_id = auth.uid());

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post on public.post_comments (post_id, created_at);
alter table public.post_comments enable row level security;
create policy "comments readable" on public.post_comments for select to authenticated using (true);
create policy "comment as yourself" on public.post_comments for insert to authenticated with check (user_id = auth.uid());
create policy "delete your own comments" on public.post_comments for delete to authenticated using (user_id = auth.uid());

-- Messages are private: only the sender and the recipient can read them.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipient uuid not null references auth.users (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1000),
  post jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (body <> '' or post is not null)
);
create index if not exists messages_sender on public.messages (sender, created_at desc);
create index if not exists messages_recipient on public.messages (recipient, created_at desc);
alter table public.messages enable row level security;
create policy "read your own messages" on public.messages for select to authenticated
  using (sender = auth.uid() or recipient = auth.uid());
create policy "send as yourself" on public.messages for insert to authenticated
  with check (sender = auth.uid() and recipient <> auth.uid());

-- The recipient can mark a message as read, and nothing else.
create or replace function public.mark_read(other uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.messages set read_at = now() where recipient = auth.uid() and sender = other and read_at is null;
$$;
revoke all on function public.mark_read(uuid) from public, anon;
grant execute on function public.mark_read(uuid) to authenticated;

-- New messages arrive in the app right away.
alter publication supabase_realtime add table public.messages;
