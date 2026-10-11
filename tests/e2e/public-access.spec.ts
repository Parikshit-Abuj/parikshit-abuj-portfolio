import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

for (const path of [
  "/admin",
  "/admin/preview",
  "/admin/resume",
  "/admin/reset-password",
]) {
  test(`anonymous access to ${path} requires login`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(
      new URL(response.headers().location, "http://127.0.0.1:3000").pathname,
    ).toBe("/admin/login");
  });
}

test("anonymous database reads cannot disclose owner identity or private draft", async ({
  request,
}) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  test.skip(
    !url || !key,
    "Configure a Supabase project to verify its actual RLS policies.",
  );
  for (const table of ["portfolio_owner", "portfolio_draft"]) {
    const response = await request.get(`${url}/rest/v1/${table}?select=*`, {
      headers: { apikey: key! },
    });
    // Hosted Supabase can grant SELECT by default; row-level policies still hide every row.
    if (response.ok()) expect(await response.json()).toEqual([]);
    else expect([401, 403]).toContain(response.status());
  }
});

test("public resume uses the published revision and is absent before first publication", async ({
  request,
}) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  test.skip(!url || !key, "Configure a Supabase project first.");
  const snapshotResponse = await request.get(
    `${url}/rest/v1/published_portfolio?select=source_revision,content`,
    { headers: { apikey: key! } },
  );
  expect(snapshotResponse.ok()).toBe(true);
  const rows = await snapshotResponse.json();
  const website = await request.get("/");
  expect(website.status()).toBe(200);
  const resume = await request.get("/api/resume");
  expect(resume.headers()["cache-control"]).toContain("no-store");
  if (!rows.length) {
    expect(await website.text()).toContain("The portfolio is being prepared.");
    expect(resume.status()).toBe(404);
  } else {
    expect(resume.status()).toBe(200);
    expect(resume.headers()["content-type"]).toContain("application/pdf");
    expect(resume.headers()["x-portfolio-revision"]).toBe(
      String(rows[0].source_revision),
    );
    const document = await PDFDocument.load(await resume.body());
    expect(document.getPageCount()).toBeGreaterThan(0);
    expect(document.getTitle()).toBe(
      `${rows[0].content.profile.name} - Resume`,
    );
  }
});
