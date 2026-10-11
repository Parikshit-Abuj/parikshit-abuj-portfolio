begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('portfolio-media','portfolio-media',false,3145728,array['image/webp']) on conflict(id) do nothing;
create policy portfolio_photo_owner_insert on storage.objects for insert to authenticated
with check (bucket_id='portfolio-media' and private.is_owner() and split_part(name,'/',1) = auth.uid()::text);
create policy portfolio_photo_owner_read on storage.objects for select to authenticated
using (bucket_id='portfolio-media' and private.is_owner() and split_part(name,'/',1) = auth.uid()::text);
create policy portfolio_photo_published_read on storage.objects for select to anon,authenticated
using (bucket_id='portfolio-media' and storage.allow_any_operation(array['object.get_authenticated_info','object.get_authenticated'])
  and exists(select 1 from public.published_portfolio p where p.content->'profile'->>'photoPath' = name));
commit;
