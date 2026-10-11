import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { fixture } from "./fixtures";

const owner = "10000000-0000-4000-8000-000000000001",
  outsider = "10000000-0000-4000-8000-000000000002";
let database: PGlite;
async function as(role: "anon" | "authenticated", user = "") {
  await database.exec(`reset role; set role ${role};`);
  await database.query(
    "select set_config('request.jwt.claim.sub', $1, false)",
    [user],
  );
}
async function published() {
  return (
    await database.query<{ content: typeof fixture; source_revision: number }>(
      "select content, source_revision from public.published_portfolio",
    )
  ).rows;
}

beforeAll(async () => {
  database = new PGlite();
  // Match the roles and JWT subject function that Supabase supplies. Execute the actual application migration unchanged.
  await database.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
  await database.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key,bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant select,insert on storage.objects to anon,authenticated;
    create function storage.allow_any_operation(operations text[]) returns boolean language sql stable as $$ select current_setting('storage.operation',true) = any(operations) $$;`);
  const migrations = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(migrations))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    await database.exec(await readFile(new URL(file, migrations), "utf8"));
  }
});
beforeEach(async () => {
  await database.exec(
    "reset role; truncate public.published_portfolio, public.portfolio_draft, public.portfolio_owner, auth.users;",
  );
  await database.query("insert into auth.users values ($1), ($2)", [
    owner,
    outsider,
  ]);
  await database.query(
    "insert into public.portfolio_owner(user_id) values($1)",
    [owner],
  );
  await database.query(
    "insert into public.portfolio_draft(content) values($1::jsonb)",
    [JSON.stringify(fixture)],
  );
});
afterAll(async () => {
  await database?.close();
});

describe("database authorization and atomic publication", () => {
  it("anonymous visitors cannot read drafts, owner identity, or invoke mutations", async () => {
    await as("anon");
    expect(await published()).toEqual([]);
    await expect(
      database.query("select * from public.portfolio_draft"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      database.query("select * from public.portfolio_owner"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      database.query("select public.publish_portfolio(1)"),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("another authenticated user cannot read drafts or edit content", async () => {
    await as("authenticated", outsider);
    expect(
      (await database.query("select * from public.portfolio_draft")).rows,
    ).toEqual([]);
    expect(
      (await database.query("select * from public.portfolio_owner")).rows,
    ).toEqual([]);
    await expect(
      database.query("select public.save_portfolio_draft($1::jsonb,1)", [
        JSON.stringify(fixture),
      ]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      database.query("select public.publish_portfolio(1)"),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("owner CRUD persists privately and only changes public data on publication", async () => {
    await as("authenticated", owner);
    await database.query("select public.publish_portfolio(1)");
    const edited = structuredClone(fixture);
    edited.profile.title = "QA Engineer";
    edited.skillGroups[0].skills = ["Playwright"];
    edited.projects = [];
    edited.experiences.push({
      ...edited.experiences[0],
      id: "10000000-0000-4000-8000-000000000003",
      company: "New Employer",
    });
    const saved = await database.query<{ save_portfolio_draft: number }>(
      "select public.save_portfolio_draft($1::jsonb,1)",
      [JSON.stringify(edited)],
    );
    expect(saved.rows[0].save_portfolio_draft).toBe(2);
    expect((await published())[0].content.profile.title).toBe(
      "Software Developer",
    );
    await database.query("select public.publish_portfolio(2)");
    await as("anon");
    const snapshot = (await published())[0];
    expect(snapshot.source_revision).toBe(2);
    expect(snapshot.content.profile.title).toBe("QA Engineer");
    expect(snapshot.content.projects).toHaveLength(0);
    expect(snapshot.content.experiences.at(-1)?.company).toBe("New Employer");
    expect(snapshot.content.skillGroups[0].skills).toEqual(["Playwright"]);
  });
  it("excludes hidden content from anonymous database responses", async () => {
    await as("authenticated", owner);
    const hidden = structuredClone(fixture);
    hidden.projects[0].visible = false;
    await database.query("select public.save_portfolio_draft($1::jsonb,1)", [
      JSON.stringify(hidden),
    ]);
    await database.query("select public.publish_portfolio(2)");
    expect(
      (
        await database.query<{ content: typeof fixture }>(
          "select content from public.portfolio_draft",
        )
      ).rows[0].content.projects,
    ).toHaveLength(1);
    await as("anon");
    expect((await published())[0].content.projects).toEqual([]);
    expect(JSON.stringify(await published())).not.toContain("Example Project");
  });
  it("rejects stale saves and stale publication without losing the live snapshot", async () => {
    await as("authenticated", owner);
    await database.query("select public.publish_portfolio(1)");
    await database.query("select public.save_portfolio_draft($1::jsonb,1)", [
      JSON.stringify(fixture),
    ]);
    await expect(
      database.query("select public.save_portfolio_draft($1::jsonb,1)", [
        JSON.stringify(fixture),
      ]),
    ).rejects.toMatchObject({ code: "PT409" });
    await expect(
      database.query("select public.publish_portfolio(1)"),
    ).rejects.toMatchObject({ code: "PT409" });
    expect((await published())[0].source_revision).toBe(1);
  });
  it("denies direct table writes even for the owner", async () => {
    await as("authenticated", owner);
    await expect(
      database.query("update public.portfolio_draft set revision=999"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      database.query("delete from public.published_portfolio"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      database.query("update public.portfolio_owner set user_id=$1", [
        outsider,
      ]),
    ).rejects.toMatchObject({ code: "42501" });
  });
});

it("publishes nested custom sections without exposing hidden entries or placement IDs", async () => {
  const content = structuredClone(fixture);
  const entry = {
    id: crypto.randomUUID(),
    visible: true,
    title: "Published award",
    organization: "",
    date: "",
    description: "",
    bullets: [],
    url: "",
  };
  const id = crypto.randomUUID();
  content.customSections = [
    {
      id: crypto.randomUUID(),
      visible: true,
      title: "Achievements",
      showOnWebsite: true,
      showOnResume: true,
      entries: [
        entry,
        {
          ...entry,
          id: crypto.randomUUID(),
          visible: false,
          title: "Secret entry",
        },
      ],
    },
    {
      id,
      visible: false,
      title: "Secret section",
      showOnWebsite: true,
      showOnResume: true,
      entries: [entry],
    },
  ];
  content.resume = { sectionOrder: [`custom:${id}`, "projects"] };
  await as("authenticated", owner);
  await database.query("select public.save_portfolio_draft($1::jsonb,1)", [
    JSON.stringify(content),
  ]);
  await database.query("select public.publish_portfolio(2)");
  await as("anon");
  const rows = await published();
  expect(JSON.stringify(rows)).not.toContain("Secret");
  expect(rows[0].content.customSections![0].entries).toHaveLength(1);
  expect(rows[0].content.resume!.sectionOrder).toEqual(["projects"]);
});
it("restricts photo uploads and allows anonymous downloads only for the published reference", async () => {
  const publishedName = `${owner}/${crypto.randomUUID()}.webp`,
    draftName = `${owner}/${crypto.randomUUID()}.webp`;
  await database.exec("reset role");
  await database.query(
    "insert into storage.objects(id,bucket_id,name) values($1,'portfolio-media',$2),($3,'portfolio-media',$4)",
    [crypto.randomUUID(), publishedName, crypto.randomUUID(), draftName],
  );
  const content = structuredClone(fixture);
  content.profile.photoPath = publishedName;
  await as("authenticated", owner);
  await database.query("select public.save_portfolio_draft($1::jsonb,1)", [
    JSON.stringify(content),
  ]);
  await database.query("select public.publish_portfolio(2)");
  await as("anon");
  await database.query(
    "select set_config('storage.operation','object.get_authenticated',false)",
  );
  const reads = await database.query<{ name: string }>(
    "select name from storage.objects",
  );
  expect(reads.rows.map((r) => r.name)).toEqual([publishedName]);
  await database.query(
    "select set_config('storage.operation','object.list',false)",
  );
  expect((await database.query("select * from storage.objects")).rows).toEqual(
    [],
  );
  await as("authenticated", outsider);
  await expect(
    database.query(
      "insert into storage.objects values($1,'portfolio-media',$2)",
      [crypto.randomUUID(), `${outsider}/test.webp`],
    ),
  ).rejects.toMatchObject({ code: "42501" });
});
