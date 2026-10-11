import { AuthForm } from "@/components/auth-form";
import { isConfigured } from "@/lib/supabase/server";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
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
          This recovery link could not be verified. Request a new link.
        </div>
      )}
      <AuthForm configured={isConfigured()} />
    </>
  );
}
