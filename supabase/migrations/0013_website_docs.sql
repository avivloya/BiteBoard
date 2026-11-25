-- Storage for the Snapspoon website (docs/index.html, served by GitHub Pages).
-- The website keeps its data as small JSON documents, like "data/users/<you>/day-2026-11-25" or "profiles/<you>".
-- docs/cloud.js reads and writes them here after you sign in with Google.
--
-- Who can see what:
--   data/users/<you>/...  your food log, boards, goals, recipes: only you
--   profiles, likes, comments: everyone signed in (they're public on the site), but you only write your own
--   messages: one row per conversation, seen only by the sender and the person it's to
--   reports: only you (read them in the Table Editor)

create table if not exists public.web_docs (
  collection text not null check (char_length(collection) <= 120),
  id text not null check (char_length(id) <= 120),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipient uuid references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  client_id text check (char_length(client_id) <= 40),
  updated_at timestamptz not null default now(),
  primary key (collection, id),
  constraint web_docs_size check (pg_column_size(data) < 1000000)
);

create index if not exists web_docs_owner on public.web_docs (owner);
create index if not exists web_docs_recipient on public.web_docs (recipient) where recipient is not null;

-- Where you're allowed to write.
create or replace function public.web_doc_allowed(c text, i text, r uuid) returns boolean
language sql stable set search_path = '' as $$
  select case
    when c = 'data/users/' || auth.uid()::text then r is null
    when c in ('profiles', 'likes', 'comments', 'reports') then i = auth.uid()::text and r is null
    when c = 'messages' then r is not null and i = auth.uid()::text || '>' || r::text
    else false
  end
$$;

alter table public.web_docs enable row level security;

create policy "read own, shared, or messages to you" on public.web_docs for select to authenticated
  using (owner = auth.uid() or recipient = auth.uid() or collection in ('profiles', 'likes', 'comments'));
create policy "add your own" on public.web_docs for insert to authenticated
  with check (owner = auth.uid() and public.web_doc_allowed(collection, id, recipient));
create policy "change your own" on public.web_docs for update to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid() and public.web_doc_allowed(collection, id, recipient));
create policy "delete your own" on public.web_docs for delete to authenticated
  using (owner = auth.uid());

-- Same word filter as the app (migration 0010) for public text and messages.
create or replace function public.web_docs_words() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.collection in ('profiles', 'comments', 'messages')
     and public.has_blocked_words((new.data - 'photo' - 'recipes')::text) then
    raise exception 'That has words that aren''t allowed on Snapspoon. Please change it and try again.' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger web_docs_words before insert or update on public.web_docs
  for each row execute function public.web_docs_words();

-- Live updates (new likes, comments, messages, and your other devices).
alter publication supabase_realtime add table public.web_docs;
