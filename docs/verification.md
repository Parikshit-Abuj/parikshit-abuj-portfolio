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
- Recovery request failures now distinguish email quota exhaustion, request throttling, and unauthorized recipients. The owner's browser screenshot confirms the email sending limit was reached: the application displayed the message mapped specifically from `over_email_send_rate_limit`.
- After the owner signed in again, the portfolio project's status was changed to Completed and its description updated to describe the implemented CRUD, draft publishing, and synchronized PDF features. The owner dashboard confirmed publication of revision 5. The public website displayed the final entry, and the downloaded two-page A4 resume contained the same completed status and description. Both pages were rendered and visually reviewed. All nine HTTP checks passed again against this published snapshot.

## Resume and recruiter-view update

- The latest type check, production build, formatting check, 23 unit/database/component/PDF tests, and 10 HTTP checks passed.
- Revision 7 was saved and published through the owner studio. The anonymous PDF and portrait endpoints returned that revision, and the website displayed the updated portfolio project entry.
- The exported resume has two A4 pages with black text, readable 11 pt body type, all three education records, and selectable text. Both pages were rendered and visually reviewed. Extraction tests cover section ordering, custom content, hidden content, heading pagination, and long skills lists.
- Custom section and entry CRUD, visibility, independent ordering, and portrait replacement/removal/reset are covered by component tests. Database tests execute the actual migrations and check nested privacy filtering, revision conflicts, and portrait access policies.
- The supplied portrait was uploaded through the owner editor. Anonymous download of the currently published image succeeded; anonymous bucket listing returned no objects. The encoded image is a metadata-stripped 610 by 640 WebP.
- Desktop and mobile layouts were reviewed. Keyboard disclosure, menu Escape handling, and menu closure after contact navigation were checked. Earlier responsive checks covered 360, 390, 768, 1366, and 1920 pixels. A later attempt to apply 320 pixels did not change the browser's reported viewport, so 320-pixel reflow and actual 200% browser zoom are not claimed as verified.
- The final public preview screenshot and exported PDF are saved in ignored output directories. The original resume and portrait remain outside the repository.

## Simplified portfolio navigation

- Removed the repeated header/contact resume links, horizontal section navigation, and contact-section LinkedIn link. The introduction now contains the only resume download and a quieter Contact me text link; the menu provides section navigation.
- Public and private preview render exactly one resume link with their respective download endpoint. Both Contact shortcuts target the single contact section. All 25 tests, type checking, and formatting checks pass.
- Browser review confirmed desktop, 390-pixel mobile, and 320-pixel mobile layouts without horizontal overflow. Contact navigation closes the menu; outside-click dismissal and Escape handling still work. The mobile header gives the name sufficient room after removing its resume button.

## Classic resume and optional academic details

- The final type check, production build, formatting check, 32 unit/database/component/PDF tests, and 10 read-only HTTP checks passed.
- The owner editor saved and published revision 11. The anonymous resume and portrait endpoints both returned revision 11, and the recruiter page displayed the revised Full-Stack Developer headline and project descriptions.
- Education now accepts affiliation, location, academic highlights, and CGPA/scale, percentage, or grade. A hidden temporary entry was saved and reloaded to verify score persistence; an invalid percentage was rejected, clearing the result removed its inputs, and the temporary entry was removed before publication. All three original education records remain. Unknown marks were left blank.
- Optional project months, certification credential IDs, and language proficiency were exercised and reset without changing the original records. Database and rendering tests verify optional-field persistence, output, omitted empty values, chronological validation, and privacy filtering.
- The published two-page A4 PDF was exported, rendered, and visually reviewed on both pages. It uses black Times text, 11 pt body type, centered identity/contact, thin rules, hanging bullets, right-aligned dates, and natural pagination. Short projects retain their links on the same page; oversized entries and long URLs are covered by text extraction and page-boundary tests.
- Shared summary and project wording was revised without inventing metrics, grades, dates, or credentials. The portfolio CMS remains included in the resume. No additional database migration or frontend deployment was performed.

## Password recovery follow-up

- On 11 October 2026, the owner explicitly asked to skip password-recovery verification and continue implementation. Recovery-email delivery and quota-error handling are confirmed; successful reset and subsequent sign-in remain unverified. Recovery must start and finish in the same browser. Password entry and submission stay with the owner.
- Later on 11 October 2026, the owner reported that password recovery worked successfully. This supersedes the earlier local recovery deferral. The result is owner-reported, not an independently observed password-entry test; HTTPS recovery on the future deployed address remains a launch check.

## Handoff

The portfolio is hosted at [parikshit-abuj-portfolio.vercel.app](https://parikshit-abuj-portfolio.vercel.app). The portfolio project is included in the published content and exported resume. Deployment setup and post-deployment checks are documented in [deployment.md](deployment.md).

## Deployment gate

Publishing a database snapshot is distinct from deploying the website. The owner approved and completed the Vercel deployment. The included Vercel address is live; no purchased domain is claimed. Production origin and authentication callbacks are configured.

## Vercel launch preparation

- The owner selected Vercel with an included `.vercel.app` address and no domain purchase. Repository configuration pins Node.js 24.x and supplies Next.js, `npm ci`, and `npm run build` settings. Vercel local link files are ignored.
- Type checking, formatting, production build, all 32 existing tests, and all 10 anonymous HTTP checks passed after these changes. The HTTP suite accepts `E2E_BASE_URL` for post-launch checks and uses the selected origin for callback expectations without starting a local server.
- At the preparation checkpoint, account sign-in and repository authorization were being completed manually by the owner in Chrome; deployment was held for configuration review. The subsequent production redeployment is verified below.
- Subsequent GitHub/Vercel evidence confirms the initial deployment of commit `3040850` completed. The owner's Production settings screenshot confirms `parikshit-abuj-portfolio.vercel.app`. Anonymous HTTPS checks returned the preparation page (200) and unavailable resume (404), so a successful launch is not claimed. Production environment setup, callback configuration, and another approved deployment remain pending. At that checkpoint, further repository pushes were held because the Vercel Git integration can deploy them automatically. The owner subsequently completed configuration and redeployment.

These observations describe this verification run. They do not replace rerunning appropriate checks after future code or configuration changes. Personal seed data, exported PDFs, credentials, and environment files remain outside Git.

## Reliability review — 12 October 2026

- Fixed two editor failure paths: a rejected sign-out request left controls disabled, and a portrait upload could finish during a save and lose the selected portrait. Sign-out provider errors now return a retry message; client errors release the editor without discarding edits. Portrait uploads temporarily block save, publish, reset, navigation, and sign-out until success or failure, and warn before leaving the page.
- Four regression cases cover connection/provider sign-out failures, a delayed portrait upload followed by a save, and upload failure recovery. All 37 tests, type checking, formatting, and the production build passed. The production dependency audit reported no vulnerabilities.
- Live anonymous HTTP checks passed 9 cases with the local alias check skipped. The public browser showed no captured warnings/errors; outside-click and Escape menu dismissal and project disclosure worked. Layout widths at 320, 390, and 768 pixels stayed within the viewport, and the portrait loaded.
- Failure scenarios use isolated mocked requests to avoid changing the owner's production data or authentication credentials. Successful live recovery remains owner-reported from the deployment verification.

## Production redeployment checks

- The owner saved the production environment variables, configured the exact HTTPS Supabase Site URL/callback, retained the local callback, and manually redeployed. The supplied Vercel screenshot shows Production Ready with source commit `3040850`.
- The live HTTP suite passed 9 checks; the localhost-alias check was correctly skipped. This verifies the callback origin and retry behavior, anonymous editor/private PDF access restrictions, actual database privacy, published PDF revision, and portrait upload access restrictions.
- The public portrait endpoint returned 200, WebP content, and revision 12. The actual portrait loaded in the browser. The browser's resume download succeeded; both A4 PDF pages were rendered and visually reviewed, retaining all three education records and the owner's updated experience location.
- The public recruiter page was reviewed on desktop and at 390 pixels. The mobile document width was 375 pixels within a 390-pixel viewport, and the menu closed after navigation. No horizontal overflow was observed.
- The live owner saved revision 15 with the actual Vercel URL on the existing ParikshitAbuj.com project. Reload retained the change, private preview showed it, and the public page retained revision 12 until publication. Publishing succeeded; the public page and PDF then used revision 15. Both updated PDF pages were rendered and reviewed. All three education records and the existing Pune experience location remain.
- Sign-out completed, and a subsequent attempt to open /admin redirected to login. The owner reported a successful reset and subsequent sign-in on the live HTTPS site in Chrome; password entry and submission were performed by the owner.
- The final anonymous HTTPS suite passed 9 checks with the local alias check skipped. Website content updates require Save draft and Publish, without a Git push or frontend deployment.
