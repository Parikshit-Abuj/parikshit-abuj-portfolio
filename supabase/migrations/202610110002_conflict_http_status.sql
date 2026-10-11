-- A stale editor revision is an HTTP 409 conflict, not a transient serialization failure.
-- Using 40001 makes PostgREST retry a conflict that cannot resolve itself.
begin;
create or replace function public.save_portfolio_draft(new_content jsonb, expected_revision integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare saved_revision integer;
begin
  if not private.is_owner() then raise exception 'Owner access required' using errcode = '42501'; end if;
  update public.portfolio_draft set content = new_content, revision = revision + 1, updated_at = now()
    where id = true and revision = expected_revision returning revision into saved_revision;
  if saved_revision is null then raise exception 'Draft changed in another tab. Reload before saving.' using errcode = 'PT409'; end if;
  return saved_revision;
end;
$$;

create or replace function public.publish_portfolio(expected_revision integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare draft public.portfolio_draft; published_content jsonb; collection text;
begin
  if not private.is_owner() then raise exception 'Owner access required' using errcode = '42501'; end if;
  select * into draft from public.portfolio_draft where id = true for update;
  if draft.revision is distinct from expected_revision then raise exception 'Draft changed in another tab. Reload before publishing.' using errcode = 'PT409'; end if;
  published_content := draft.content;
  -- Hidden entries never leave the private draft, even through direct public database reads.
  foreach collection in array array['skillGroups','experiences','projects','education','certifications','languages'] loop
    published_content := jsonb_set(published_content, array[collection],
      coalesce((select jsonb_agg(entry order by position) from jsonb_array_elements(draft.content->collection) with ordinality as rows(entry, position)
        where entry->>'visible' = 'true'), '[]'::jsonb));
  end loop;
  insert into public.published_portfolio(id, content, source_revision, published_at)
    values(true, published_content, draft.revision, now())
    on conflict(id) do update set content = excluded.content, source_revision = excluded.source_revision, published_at = excluded.published_at;
  return draft.revision;
end;
$$;
revoke all on function public.save_portfolio_draft(jsonb, integer), public.publish_portfolio(integer) from public;
grant execute on function public.save_portfolio_draft(jsonb, integer), public.publish_portfolio(integer) to authenticated;

commit;
