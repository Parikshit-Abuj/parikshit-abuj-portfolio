import { AuthForm } from "@/components/auth-form";
import { isConfigured } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const site = new URL(process.env.NEXT_PUBLIC_SITE_URL);
    if ((await headers()).get("host") !== site.host) {
      redirect(new URL("/admin/login", site.origin).toString());
    }
  }
  const params = await searchParams;
  return (
    <>
      {params.updated && (
        <div className="preview-banner" role="status">
          Password updated. Sign in with your new password.
        </div>
      )}
      {params.error && (
        <div className="preview-banner" role="alert">
          {params.error === "recovery_browser"
            ? "Start a new recovery request here, then open the newest email in this same browser. Keep this site address unchanged."
            : "This recovery link could not be verified. Request a new link and open the newest email."}
        </div>
      )}
      <AuthForm configured={isConfigured()} />
    </>
  );
}
