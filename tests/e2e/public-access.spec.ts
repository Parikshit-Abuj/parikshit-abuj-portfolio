import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

test("authentication callbacks retain the configured origin and reject external destinations", async ({
  request,
}) => {
  const origin = new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000",
  ).origin;
  const response = await request.get(
    "/auth/callback?next=https://example.com",
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe(
    `${origin}/admin/login?error=recovery`,
  );
});

test("localhost authentication requests return to the configured origin before creating cookies", async ({
  request,
}) => {
  const origin = new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000",
  ).origin;
  test.skip(
    origin !== "http://127.0.0.1:3000",
    "This alias check is specific to the local configuration.",
  );
  const response = await request.get("http://localhost:3000/admin/login", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe(`${origin}/admin/login`);
});

test("a recovery callback without its browser verifier gives a safe retry message", async ({
  request,
}) => {
  const origin = new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000",
  ).origin;
  const response = await request.get(
    "/auth/callback?code=invalid-test-code&next=https://example.com",
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe(
    `${origin}/admin/login?error=recovery_browser`,
  );
  const page = await request.get("/admin/login?error=recovery_browser");
  expect(await page.text()).toContain("Keep this site address unchanged.");
});

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

test("portrait endpoints reject anonymous writes and external upload origins", async ({
  request,
}) => {
  const origin = new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000",
  ).origin;
  const foreign = await request.post("/admin/profile-photo", {
    headers: { Origin: "https://example.com" },
    data: "",
  });
  expect(foreign.status()).toBe(403);
  const anonymous = await request.post("/admin/profile-photo", {
    headers: { Origin: origin },
    data: "",
  });
  expect(anonymous.status()).toBe(403);
  const draft = await request.get("/admin/profile-photo");
  expect(draft.status()).toBe(403);
  const publicImage = await request.get(
    "/api/profile-photo?path=unrelated-private-file.webp",
  );
  expect([200, 404]).toContain(publicImage.status());
  if (publicImage.status() === 200) {
    expect(publicImage.headers()["content-type"]).toBe("image/webp");
    expect(publicImage.headers()["cache-control"]).toBe("no-store");
  }
});
