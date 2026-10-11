# Deployment handoff

The website is not deployed. The owner requested approval before any online website deployment. Publishing a Supabase content snapshot does not authorize a frontend deployment or domain purchase.

## Selected host and manual setup

Use Vercel Hobby for this personal Next.js portfolio and keep the configured Supabase project for authentication and content. No custom domain or paid plan is planned. The owner completes account creation/terms and GitHub repository authorization in Chrome. Authorize only `Parikshit-Abuj/parikshit-abuj-portfolio`, then use Add New → Project → Import. Stop before Deploy for configuration review and explicit launch approval.

Use project name `parikshit-abuj-portfolio`, production branch `main`, Next.js preset, and root directory `./`. The committed `vercel.json` selects Next.js, `npm ci`, and `npm run build`. Let the framework choose its output directory; this application needs Node.js functions for login, PDFs, and portrait processing, so do not use a static export.

Node.js 24.x is pinned in `package.json`, matching the runtime used for local verification. Confirm 24.x in Vercel's build settings.

Use the available `.vercel.app` address assigned to this project. The expected address is `https://parikshit-abuj-portfolio.vercel.app`, but availability must be confirmed in Vercel before using it as the production origin. If unavailable, accept Vercel's assigned alternative and use that exact origin throughout. `ParikshitAbuj.com` remains the project identity, not a purchased domain.

## Environment values

Configure these on the approved host before building:

| Variable                               | Value                                                       |
| -------------------------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | The existing Supabase project URL                           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Its publishable client key                                  |
| `NEXT_PUBLIC_SITE_URL`                 | The final HTTPS website origin, without an application path |

Use the values from the ignored local environment file through the host's environment settings. Do not commit them or upload the local environment file. The application needs no database password or administrator service key.

Set these values for Production before the first build. The site origin is part of the build and is used to keep authentication on one address. Configure it separately for each environment. An owner login on a different origin redirects to the configured origin; production values should therefore not be reused for unrelated preview URLs. Leave Preview unconfigured for this initial launch; preview authentication and editing are outside the launch setup.

## Supabase settings

- Keep public signup disabled and the existing account configured as the sole owner.
- Set Authentication's Site URL to the approved HTTPS website origin.
- Add the exact `<approved-origin>/auth/callback` to the Redirect URLs allowlist. Keep the local callback only while local development is needed.
- All existing schema migrations and owner assignment have already been applied to the current project. Avoid reinitializing or overwriting existing content during deployment.
- A published snapshot already exists. Verify the intended revision before making the frontend public.
- The owner reported successful local password recovery on 11 October 2026. Recheck recovery on the final HTTPS origin in the same browser. The existing Supabase email provider remains in use for this launch; its quotas and delivery limitations still apply. Custom SMTP is a separate future setup if needed.

After the address is confirmed, the owner can enter the exact Site URL and callback above through the signed-in Supabase dashboard. Keep the local `.env.local` origin unchanged for local development. Changing the Vercel origin requires a new build; changing published portfolio content does not.

## Checks after the approved deployment

1. Load the public portfolio on desktop and mobile using the real HTTPS URL.
2. Download the public PDF and compare its revision and content with the published portfolio.
3. Confirm anonymous users are redirected away from the editor, private preview, and private draft resume.
4. Sign in as the owner and make a private draft edit. Confirm public content stays unchanged until Publish is selected, then verify the page and PDF change together.
5. Sign out and confirm editor access is denied. Recheck the approved callback origin before any password-recovery attempt.
6. Confirm GitHub and the deployed host reference the intended commit. Subsequent Git pushes may trigger automatic deployments once the host is connected.

Run the same anonymous HTTP suite against the final site without starting a local server:

```powershell
$env:E2E_BASE_URL = "https://<confirmed-project>.vercel.app"
npm run test:e2e
Remove-Item Env:E2E_BASE_URL
```

This uses the existing local Supabase URL/publishable key to compare the backend snapshot; those must match the deployed project's backend. The localhost-alias test is skipped for HTTPS. The suite uses no owner credentials and does not save portfolio data or send recovery emails.

Review Vercel runtime logs if PDF generation, portrait loading, or authentication fails. Do not share the launch URL until these checks and the owner session checks pass. If a later release fails, restore the previous working Vercel deployment; this rolls back code, not Supabase content. Keep the first deployment unshared while fixing any initial failure.

## Official references

- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Vercel environment variables](https://vercel.com/docs/environment-variables/framework-environment-variables)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase SMTP configuration](https://supabase.com/docs/guides/auth/auth-smtp)
