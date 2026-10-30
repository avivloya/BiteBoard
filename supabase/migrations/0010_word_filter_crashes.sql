-- Word filter: the database refuses hate, threats, self-harm and pro-eating-disorder words even if someone skips the app.
-- Same list as src/lib/moderation.ts (BLOCKED) and the website. Swearing is starred out by the app, not refused here.

create or replace function public.has_blocked_words(t text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(translate(lower(t), '_.', '  ') ~ '\m(nigger[a-z]*|nigga[a-z]*|niggah|chink[a-z]*|spic|spics|kike[a-z]*|wetback[a-z]*|gook[a-z]*|raghead[a-z]*|towelhead[a-z]*|beaner[a-z]*|coon|coons|jigaboo[a-z]*|paki|pakis|faggot[a-z]*|fag|fags|dyke|dykes|tranny|trannies|shemale[a-z]*|retard|retards|retarded|kys|kill\s+yourself|kill\s+urself|go\s+die|hope\s+you\s+die|neck\s+yourself|drink\s+bleach|slit\s+your\s+wrists|proana|pro\s+ana|promia|pro\s+mia|thinspo[a-z]*|thinspiration|meanspo|bonespo|skinnyspo|starve\s+yourself|child\s+porn|pedo|pedos|pedophile[a-z]*|paedo[a-z]*|cp\s+links|heil\s+hitler|sieg\s+heil|1488|white\s+power)\M', false)
$$;

create or replace function public.refuse_blocked_words() returns trigger language plpgsql set search_path = '' as $$
declare t text;
begin
  if tg_table_name in ('post_comments', 'messages') then t := new.body;
  elsif tg_table_name = 'profiles' then t := concat_ws(' ', new.handle, new.name, new.bio);
  elsif tg_table_name = 'shared_recipes' then t := (new.recipe - 'image' - 'video' - 'cover')::text;
  end if;
  if public.has_blocked_words(t) then
    raise exception 'That has words that aren''t allowed on Biteboard. Please change it and try again.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger post_comments_words before insert or update on public.post_comments for each row execute function public.refuse_blocked_words();
create trigger messages_words before insert or update on public.messages for each row execute function public.refuse_blocked_words();
create trigger profiles_words before insert or update on public.profiles for each row execute function public.refuse_blocked_words();
create trigger shared_recipes_words before insert or update on public.shared_recipes for each row execute function public.refuse_blocked_words();

-- Crash reports. The app sends one when it hits an error; only you can read them (Table Editor › app_errors).
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  message text not null check (char_length(message) <= 500),
  stack text check (char_length(stack) <= 4000),
  screen text check (char_length(screen) <= 200),
  platform text check (char_length(platform) <= 40),
  app_version text check (char_length(app_version) <= 40),
  fatal boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.app_errors enable row level security;
create policy "anyone can send a crash report" on public.app_errors for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
