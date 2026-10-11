create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.portfolio_owner (
  id boolean primary key default true check (id),
  user_id uuid not null unique references auth.users(id) on delete restrict
);
alter table public.portfolio_owner enable row level security;
grant select on public.portfolio_owner to authenticated;
create policy owner_read on public.portfolio_owner for select to authenticated using (user_id = (select auth.uid()));

create function private.is_owner() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.portfolio_owner where user_id = (select auth.uid()));
$$;
revoke all on function private.is_owner() from public;
grant execute on function private.is_owner() to authenticated;

create table public.portfolio_draft (
  id boolean primary key default true check (id),
  content jsonb not null check (jsonb_typeof(content) = 'object' and coalesce(content->>'schemaVersion' = '1', false)),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
create table public.published_portfolio (
  id boolean primary key default true check (id),
  content jsonb not null check (jsonb_typeof(content) = 'object' and coalesce(content->>'schemaVersion' = '1', false)),
  source_revision integer not null,
  published_at timestamptz not null default now()
);
alter table public.portfolio_draft enable row level security;
alter table public.published_portfolio enable row level security;
grant select on public.portfolio_draft to authenticated;
grant select on public.published_portfolio to anon, authenticated;
create policy draft_owner_read on public.portfolio_draft for select to authenticated using ((select private.is_owner()));
create policy published_read on public.published_portfolio for select to anon, authenticated using (true);
-- All writes use guarded functions. There are deliberately no client write grants or write policies.
revoke insert, update, delete on public.portfolio_owner, public.portfolio_draft, public.published_portfolio from anon, authenticated;

create function public.save_portfolio_draft(new_content jsonb, expected_revision integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare saved_revision integer;
begin
  if not private.is_owner() then raise exception 'Owner access required' using errcode = '42501'; end if;
  update public.portfolio_draft set content = new_content, revision = revision + 1, updated_at = now()
    where id = true and revision = expected_revision returning revision into saved_revision;
  if saved_revision is null then raise exception 'Draft changed in another tab. Reload before saving.' using errcode = '40001'; end if;
  return saved_revision;
end;
$$;

create function public.publish_portfolio(expected_revision integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare draft public.portfolio_draft; published_content jsonb; collection text;
begin
  if not private.is_owner() then raise exception 'Owner access required' using errcode = '42501'; end if;
  select * into draft from public.portfolio_draft where id = true for update;
  if draft.revision is distinct from expected_revision then raise exception 'Draft changed in another tab. Reload before publishing.' using errcode = '40001'; end if;
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
