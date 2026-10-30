-- Verified badge. Only Snapspoon (the service role or the SQL editor) can turn it on or off;
-- a user's own profile save can never change it. See the Snapspoon verification rules.

alter table public.profiles add column verified boolean not null default false;

create function public.keep_verified() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.verified := coalesce(case when tg_op = 'UPDATE' then old.verified end, false);
  end if;
  return new;
end $$;

create trigger profiles_keep_verified before insert or update on public.profiles
  for each row execute function public.keep_verified();

-- The founder's account.
update public.profiles set verified = true where lower(handle) = 'avivloya';

-- @snapspoon is the official account. Only a verified profile can use the name.
create function public.reserved_handles() returns trigger language plpgsql as $$
begin
  if lower(new.handle) in ('snapspoon') and not new.verified then
    raise exception 'That username is saved for the official Snapspoon account.' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- Runs after profiles_keep_verified (triggers run in name order), so a user can't sneak verified = true past it.
create trigger profiles_reserved_handles before insert or update on public.profiles
  for each row execute function public.reserved_handles();
