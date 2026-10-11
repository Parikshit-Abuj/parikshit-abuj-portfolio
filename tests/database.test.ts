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
