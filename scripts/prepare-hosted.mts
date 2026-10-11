import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { portfolioSchema } from "../src/lib/portfolio.ts";

// Generate SQL for the authenticated dashboard, without handling an admin secret.
const input = resolve(process.argv[2] ?? ".local/portfolio-seed.json");
const content = portfolioSchema.parse(
  JSON.parse(await readFile(input, "utf8")),
);
const email = process.argv[3] ?? content.profile.email;
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw new Error("Enter a valid owner email.");
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const sql = `-- Run after the schema migration and creating the owner in Authentication > Users.
-- Initializes only an empty draft; rerunning preserves all subsequent edits.
begin;
do $bootstrap$
declare owner_id uuid;
begin
  select id into owner_id from auth.users where lower(email) = lower(${quote(email)});
  if owner_id is null then raise exception 'Create the owner account in Authentication > Users first.'; end if;
  if exists(select 1 from public.portfolio_owner where user_id <> owner_id) then
    raise exception 'A different owner is already configured. No changes were made.';
  end if;
  insert into public.portfolio_owner(id, user_id) values(true, owner_id) on conflict(id) do nothing;
  insert into public.portfolio_draft(id, content, revision)
    values(true, ${quote(JSON.stringify(content))}::jsonb, 1) on conflict(id) do nothing;
end;
$bootstrap$;
commit;
`;
await mkdir(".local", { recursive: true });
const output = resolve(".local/owner-and-resume.sql");
await writeFile(output, sql, "utf8");
console.log(
  `Owner and draft setup SQL written to ${output}. No data has been uploaded.`,
);
