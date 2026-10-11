# ParikshitAbuj.com — Portfolio & Resume CMS

A personal portfolio with one private owner editor. Recruiters can browse the published portfolio and download an A4 PDF resume. The owner can change the profession, contact details, skills, experience, projects, education, certifications, and languages.

**Save draft → Preview → Publish** controls what visitors see. The public page and resume download read the same published snapshot. Hidden entries stay in the private draft and are removed from the public database snapshot as well as the website and PDF. Entries can be added, edited, deleted, reordered, or hidden.

The name is the project identity; a domain has not been purchased. The website is not deployed. Vercel is the intended frontend host, with Supabase for authentication and PostgreSQL. Deployment and domain registration require the owner's approval.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS, Supabase Auth/PostgreSQL, and React PDF. There is no visitor signup or owner ID supplied by the browser. Database functions enforce the configured owner's identity and reject stale draft revisions.

## Run with hosted Supabase (Docker is optional)

1. Install Node.js 24 and run `npm ci`.
2. Create a Supabase project. Copy `.env.example` to `.env.local`, then set the project URL and **publishable** key. Keep `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000` during local development. Never put an administrator secret or database password in a `NEXT_PUBLIC_` variable.
3. Run all SQL files in `supabase/migrations/` in filename order once in the project's SQL Editor. Wrap it in `begin;` and `commit;` for an atomic installation. It creates the tables, row security policies, and owner-only save/publish functions.
4. In Authentication → Users, create the owner's email/password account and confirm that account. Disable **Allow new users to sign up** in the authentication settings; the application does not expose signup.
5. Save your initial content as `.local/portfolio-seed.json`, following `src/lib/portfolio.ts`. Personal content is intentionally excluded from this public repository. Run `npm run setup:hosted`. This validates the data and creates ignored `.local/owner-and-resume.sql`. Run that file in SQL Editor to associate the account with owner access and initialize the private draft. An optional second script argument selects a different owner email: `npm run setup:hosted -- .local/portfolio-seed.json owner@example.com`.
6. Under Authentication → URL Configuration, set Site URL to `http://127.0.0.1:3000` and allow `http://127.0.0.1:3000/auth/callback`. Password recovery must begin and finish in the same browser because it uses PKCE. Configure the production domain and an email delivery provider before relying on recovery in production.
7. Run `npm run dev`. Open `http://127.0.0.1:3000/admin/login`, sign in, review the draft, and publish when ready. The public page remains a preparation screen until a snapshot has been published.

The public URL/key are sufficient for runtime connections. Initial database administration uses your Supabase dashboard session; no service key is included in the website.

## Optional local Supabase

For offline backend development, install Docker and start its engine, then run `npm run db:start`. This starts the configured local Supabase stack and applies the migrations. Prepare `.local/portfolio-seed.json` and run `npm run setup:local`. This script only accepts a localhost backend, refuses to replace an existing owner or environment file, and saves generated owner credentials in ignored `.local/owner-login.json`. It leaves the initial draft unpublished.

Keep hosted and local environment files separate. Do not run `db:reset` against valuable local data: it recreates the local database. `npm run db:stop` stops the local stack. Docker and WSL are not needed when using hosted Supabase.

## Editing and resume exports

Open `/admin` to edit. Save before previewing. Editing the profile's headline changes the current profession without rewriting past job titles. Skills and other list fields use one value per line. Each entry has show/hide, ordering, and deletion controls. Deletions require confirmation and become public only after saving and publishing.

The owner can download a private draft from `/admin/resume`; visitors download the published version from `/api/resume`. Both use the same PDF component. PDF text is selectable, links are clickable, and additional pages are created automatically as content grows.

With the application running, `npm run resume:export` downloads the actual published resume into ignored `output/pdf/`. To review layout before publishing, run `npm run resume:export -- .local/portfolio-seed.json`; this produces an explicitly named private draft. A second argument chooses the output path. The original imported resume is never overwritten by these commands.

## Verification

- `npm run typecheck` generates Next.js route types and checks TypeScript.
- `npm test` checks content validation, actual migration/RLS behavior using PostgreSQL-compatible PGlite, optimistic concurrency, and PDF generation/pagination.
- `npm run build` builds the production application.
- `npm run test:e2e` runs read-only HTTP checks against the local website and configured Supabase backend. It verifies anonymous access restrictions and the published resume revision without requiring an owner password or a browser installation.

Unit/database checks do not prove a hosted Supabase login or browser publishing flow. Those require the configured backend and owner session. Before deployment, verify owner login/logout/recovery, CRUD in every section, draft privacy, anonymous access restrictions, stale revision conflicts, mobile layout, and that the published website and downloaded PDF change together. Render exported PDF pages and review their layout.

## Deployment preparation

After approval, connect this GitHub repository to Vercel and configure the three environment variables for the production origin. Update Supabase's Site URL and allowed recovery callback to the approved domain. Review authentication email delivery and confirm the database migration, owner assignment, and RLS settings in the intended production project. Do not upload `.env.local`, `.local/`, passwords, private drafts, or the source resume to GitHub.

The initial portfolio project entry remains **In progress** until the complete owner and publishing flows have been verified. No demo URL or purchased domain is claimed before it exists.
