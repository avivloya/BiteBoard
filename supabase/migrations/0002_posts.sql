-- Posting recipes with photos, and the For you feed.

create index if not exists shared_recipes_created_at on public.shared_recipes (created_at desc);

-- Recipe photos: anyone can view them; you can only add, replace or delete files in your own folder ({your user id}/...).
insert into storage.buckets (id, name, public) values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

create policy "recipe photos insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recipe photos update own" on storage.objects for update to authenticated
  using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recipe photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = auth.uid()::text);
