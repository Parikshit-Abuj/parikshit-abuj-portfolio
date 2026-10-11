# Deployment handoff

The website is not deployed. The owner requested approval before any online website deployment. Publishing a Supabase content snapshot does not authorize a frontend deployment or domain purchase.

## Proposed host

Use Vercel for the Next.js application and keep the configured Supabase project for authentication and content. Import the existing `Parikshit-Abuj/parikshit-abuj-portfolio` GitHub repository after approval. The framework preset is Next.js, the repository root is the application root, and the build command is `npm run build`. Let the framework choose its output directory.

Choose Node.js 24.x in the project's build settings, matching the runtime used for local verification.

No custom domain is required for the first deployment. An available professional Vercel project URL can be selected during setup; it is not claimed until Vercel assigns it. `ParikshitAbuj.com` remains the project identity, not a purchased domain.

## Environment values

Configure these on the approved host before building:

| Variable                               | Value                                                       |
| -------------------------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | The existing Supabase project URL                           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Its publishable client key                                  |
| `NEXT_PUBLIC_SITE_URL`                 | The final HTTPS website origin, without an application path |

Use the values from the ignored local environment file through the host's environment settings. Do not commit them or upload the local environment file. The application needs no database password or administrator service key.

The site origin is part of the build and is used to keep authentication on one address. Configure it separately for each environment. An owner login on a different origin redirects to the configured origin; production values should therefore not be reused for unrelated preview URLs.

## Supabase settings

- Keep public signup disabled and the existing account configured as the sole owner.
- Set Authentication's Site URL to the approved HTTPS website origin.
- Add the exact `<approved-origin>/auth/callback` to the Redirect URLs allowlist. Keep the local callback only while local development is needed.
- Both schema migrations and owner assignment have already been applied to the current project. Avoid reinitializing or overwriting existing content during deployment.
- A published snapshot already exists. Verify the intended revision before making the frontend public.
- Configure an approved SMTP provider when production recovery-email reliability is required. The owner deferred end-to-end password-recovery verification; delivery and quota-error handling have been observed, but a successful reset must not be described as verified.

## Checks after the approved deployment

1. Load the public portfolio on desktop and mobile using the real HTTPS URL.
2. Download the public PDF and compare its revision and content with the published portfolio.
3. Confirm anonymous users are redirected away from the editor, private preview, and private draft resume.
4. Sign in as the owner and make a private draft edit. Confirm public content stays unchanged until Publish is selected, then verify the page and PDF change together.
5. Sign out and confirm editor access is denied. Recheck the approved callback origin before any password-recovery attempt.
6. Confirm GitHub and the deployed host reference the intended commit. Subsequent Git pushes may trigger automatic deployments once the host is connected.

## Official references

- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Vercel environment variables](https://vercel.com/docs/environment-variables/framework-environment-variables)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase SMTP configuration](https://supabase.com/docs/guides/auth/auth-smtp)
