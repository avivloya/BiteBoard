-- Verified badge. Only Biteboard (the service role or the SQL editor) can turn it on or off;
-- a user's own profile save can never change it. See the Biteboard verification rules.

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
