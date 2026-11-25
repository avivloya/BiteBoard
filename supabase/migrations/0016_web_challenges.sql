-- Website challenges (docs/extras.js): each person keeps one public "challenges/<their id>" document with the
-- challenges they started, the ones they joined and their daily check-ins. Everyone signed in can read them
-- to build the leaderboards; you can only write your own. Same word filter as profiles and comments.

create or replace function public.web_doc_allowed(c text, i text, r uuid) returns boolean
language sql stable set search_path = '' as $$
  select case
    when c = 'data/users/' || auth.uid()::text then r is null
    when c in ('profiles', 'likes', 'comments', 'reports', 'challenges') then i = auth.uid()::text and r is null
    when c = 'messages' then r is not null and i = auth.uid()::text || '>' || r::text
    else false
  end
$$;

drop policy if exists "read own, shared, or messages to you" on public.web_docs;
create policy "read own, shared, or messages to you" on public.web_docs for select to authenticated
  using (owner = auth.uid() or recipient = auth.uid() or collection in ('profiles', 'likes', 'comments', 'challenges'));

create or replace function public.web_docs_words() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.collection in ('profiles', 'comments', 'messages', 'challenges')
     and public.has_blocked_words((new.data - 'photo' - 'recipes')::text) then
    raise exception 'That has words that aren''t allowed on Snapspoon. Please change it and try again.' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end $$;
