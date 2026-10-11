-- Additive publishing support: nested private entries must never reach public JSON.
begin;
create or replace function public.publish_portfolio(expected_revision integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare draft public.portfolio_draft; published_content jsonb; collection text; custom jsonb;
begin
  if not private.is_owner() then raise exception 'Owner access required' using errcode = '42501'; end if;
  select * into draft from public.portfolio_draft where id = true for update;
  if draft.revision is distinct from expected_revision then raise exception 'Draft changed in another tab. Reload before publishing.' using errcode = 'PT409'; end if;
  published_content := draft.content;
  foreach collection in array array['skillGroups','experiences','projects','education','certifications','languages'] loop
    published_content := jsonb_set(published_content, array[collection], coalesce((select jsonb_agg(entry order by position) from jsonb_array_elements(draft.content->collection) with ordinality as rows(entry, position) where entry->>'visible' = 'true'), '[]'::jsonb));
  end loop;
  select coalesce(jsonb_agg(jsonb_set(section, '{entries}', coalesce((select jsonb_agg(entry order by ep) from jsonb_array_elements(section->'entries') with ordinality e(entry,ep) where entry->>'visible' = 'true'), '[]'::jsonb)) order by sp), '[]'::jsonb) into custom
  from jsonb_array_elements(coalesce(draft.content->'customSections','[]'::jsonb)) with ordinality s(section,sp)
  where section->>'visible' = 'true' and (section->>'showOnWebsite' = 'true' or section->>'showOnResume' = 'true');
  published_content := jsonb_set(published_content, '{customSections}', custom);
  foreach collection in array array['resume','website'] loop
    if published_content ? collection then
      published_content := jsonb_set(published_content, array[collection,'sectionOrder'], coalesce((select jsonb_agg(value order by pos) from jsonb_array_elements_text(published_content->collection->'sectionOrder') with ordinality ids(value,pos)
        where value not like 'custom:%' or exists(select 1 from jsonb_array_elements(custom) c where 'custom:' || (c->>'id') = ids.value)), '[]'::jsonb));
    end if;
  end loop;
  insert into public.published_portfolio(id, content, source_revision, published_at) values(true, published_content, draft.revision, now())
  on conflict(id) do update set content=excluded.content, source_revision=excluded.source_revision, published_at=excluded.published_at;
  return draft.revision;
end;
$$;
revoke all on function public.publish_portfolio(integer) from public;
grant execute on function public.publish_portfolio(integer) to authenticated;
commit;
