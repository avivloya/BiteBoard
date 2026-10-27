-- Profile pictures. The file lives in the poster's own folder of the recipe-photos bucket
-- ({user id}/avatar.*), so the storage policies from 0002 already stop anyone else replacing it.
alter table public.profiles add column if not exists photo text;
