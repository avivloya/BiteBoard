-- Usernames are unique regardless of capitals: "Aviv" and "aviv" can't both exist.
create unique index if not exists profiles_handle_lower on public.profiles (lower(handle));
