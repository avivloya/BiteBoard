-- Lets people delete their own account from the app (required by the App Store and Google Play).
-- Removing the auth user also removes their profile, posts and follows through on delete cascade.
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
