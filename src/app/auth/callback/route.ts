import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  // Next's development request URL can normalize 127.0.0.1 to localhost.
  // Keep cookie-bound authentication on the configured, trusted site origin.
  const origin = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
    : request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  let failure = "recovery";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // This application uses email callbacks only for password recovery.
    // No destination from the URL is trusted or needed in the email allowlist.
    if (!error)
      return NextResponse.redirect(new URL("/admin/reset-password", origin));
    if (error.code === "pkce_code_verifier_not_found")
      failure = "recovery_browser";
  }
  return NextResponse.redirect(
    new URL(`/admin/login?error=${failure}`, origin),
  );
}
