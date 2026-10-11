# Verification record

Checked on 11 October 2026 against the local Next.js application and the configured hosted Supabase project. The website has not been deployed.

## Verified

- Type checking, production build, formatting, and 15 unit/database/PDF tests passed.
- Read-only HTTP checks passed against the actual backend, including the published-snapshot branch after first publication.
- Owner login and the imported private draft were verified in the browser.
- All six collections were exercised through add, edit, save, reload, hide, and delete. Temporary verification entries were removed and the original professional headline restored.
- Changing the current headline to QA Engineer changed the private preview and its PDF while preserving historical job titles. The original headline was restored before publication.
- Hidden entries were excluded from the private preview and public-content transformation. Database tests exercised hidden-content removal during publication.
- A real stale editor save returned the conflict message promptly after migration 002 was applied. Database tests also cover stale save and publish attempts.
- The private preview was checked on desktop and at a 390-pixel mobile viewport without horizontal overflow.
- The owner manually published revision 4. The anonymous website displayed the published name and headline; the resume endpoint returned HTTP 200 and revision 4.
- The downloaded published PDF contained all 70 checked content fields from the snapshot, after accounting for line-break hyphenation. Both A4 pages were rendered and visually reviewed; no glyphs extended outside the page bounds.
- Anonymous requests to all four private editor routes redirected to login. Anonymous database reads disclosed neither the owner record nor the private draft.
- Public signup is disabled in the hosted authentication settings.
- A callback-origin regression was reproduced: the development request URL changed 127.0.0.1 to localhost in authentication redirects. The callback now uses the configured origin; the login page redirects aliases to it before recovery begins. Regression checks cover the alias redirect, external-destination rejection, and the missing browser-verifier retry message. The email redirect now matches the configured callback exactly, without an extra destination query.

## Remaining before final handoff

- The owner received a recovery email, but its callback failed before password entry. After the callback fix, the owner must request a fresh link and verify password reset and subsequent sign-in in the same browser. Password entry and submission stay with the owner.
- Finalize the portfolio project's status and description after the remaining owner flow is verified; it currently says In progress.

## Deployment gate

Publishing a database snapshot is distinct from deploying the website. Vercel or another professional host still requires the owner's approval. No purchased domain or deployed portfolio URL is claimed. Configure the approved production origin, authentication callbacks, and email delivery before deployment.

These observations describe this verification run. They do not replace rerunning appropriate checks after future code or configuration changes. Personal seed data, exported PDFs, credentials, and environment files remain outside Git.
