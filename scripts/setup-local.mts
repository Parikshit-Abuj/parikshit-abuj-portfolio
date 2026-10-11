import { spawnSync } from "node:child_process";
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { portfolioSchema } from "../src/lib/portfolio.ts";

const content = portfolioSchema.parse(
  JSON.parse(await readFile(".local/portfolio-seed.json", "utf8")),
);
// Keys are captured in memory and never included in command arguments or console output.
const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["supabase", "status", "--output", "json"],
  { encoding: "utf8", shell: process.platform === "win32" },
);
if (result.status !== 0)
  throw new Error(
    "Local Supabase is not running. Start Docker and run npm run db:start first.",
  );
const status = JSON.parse(result.stdout);
const url = status.API_URL;
const publicKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
if (
  typeof url !== "string" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname)
) {
  throw new Error("Local setup refuses to modify a hosted database.");
}
if (!publicKey || !secretKey)
  throw new Error("Supabase status did not return the expected local keys.");
try {
  await access(".env.local");
  throw new Error(
    "An .env.local already exists. Preserve it or move it aside before configuring the local backend.",
  );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const admin = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const existing = await admin.from("portfolio_owner").select("user_id");
if (existing.error)
  throw new Error(`Schema unavailable: ${existing.error.message}`);
if (existing.data.length)
  throw new Error(
    "This database already has an owner. Setup will not overwrite existing data.",
  );
const password = randomBytes(24).toString("base64url");
const created = await admin.auth.admin.createUser({
  email: content.profile.email,
  password,
  email_confirm: true,
});
if (created.error) throw new Error(created.error.message);
await mkdir(".local", { recursive: true });
await writeFile(
  ".local/owner-login.json",
  JSON.stringify({ email: content.profile.email, password }, null, 2),
);
const owner = await admin
  .from("portfolio_owner")
  .insert({ id: true, user_id: created.data.user.id });
if (owner.error) throw new Error(owner.error.message);
const draft = await admin
  .from("portfolio_draft")
  .insert({ id: true, content, revision: 1 });
if (draft.error) throw new Error(draft.error.message);
await writeFile(
  ".env.local",
  `NEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publicKey}\nNEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000\n`,
);
console.log(
  "Local owner and private draft configured. Credentials are in ignored .local/owner-login.json. Sign in, preview, then publish.",
);
