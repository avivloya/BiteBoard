-- Replies, reporting and blocking, and push notifications.

-- Replies: a comment can answer another comment on the same post.
alter table public.post_comments add column if not exists parent_id uuid references public.post_comments (id) on delete set null;

-- Reports go to Snapspoon. People can file them but never read them; review them in the Supabase dashboard.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('post', 'comment', 'user', 'message')),
  target text not null,
  target_user uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 100),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'removed', 'no_action')),
  created_at timestamptz not null default now()
);
create index if not exists reports_open on public.reports (status, created_at);
alter table public.reports enable row level security;
create policy "report as yourself" on public.reports for insert to authenticated with check (reporter = auth.uid());

-- Blocks are private to the person who blocks.
create table if not exists public.blocks (
  blocker uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.blocks enable row level security;
create policy "see your blocks" on public.blocks for select to authenticated using (blocker = auth.uid());
create policy "block as yourself" on public.blocks for insert to authenticated with check (blocker = auth.uid());
create policy "unblock" on public.blocks for delete to authenticated using (blocker = auth.uid());

-- Is either person blocking the other? Used by the rules below without exposing anyone's block list.
create or replace function public.blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;
revoke all on function public.blocked_between(uuid, uuid) from public, anon;
grant execute on function public.blocked_between(uuid, uuid) to authenticated;

-- You can't message someone who blocked you (or whom you blocked).
drop policy if exists "send as yourself" on public.messages;
create policy "send as yourself" on public.messages for insert to authenticated
  with check (sender = auth.uid() and recipient <> auth.uid() and not public.blocked_between(sender, recipient));

-- Blocking also unfollows, both ways.
create or replace function public.block_unfollows() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.friendships where (user_id = new.blocker and friend_id = new.blocked) or (user_id = new.blocked and friend_id = new.blocker);
  return new;
end $$;
create trigger blocks_unfollow after insert on public.blocks for each row execute function public.block_unfollows();

-- Push notifications: each phone saves its Expo push token here.
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
create policy "your tokens" on public.push_tokens for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Activity timestamps for follows already exist (friendships.created_at), likes (post_likes.created_at),
-- comments and messages. The "notify" edge function sends the pushes; connect it in the dashboard under
-- Database › Webhooks for inserts on post_likes, post_comments, friendships and messages (see the launch guide).
