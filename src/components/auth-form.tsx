"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
export function AuthForm({
  configured,
  reset = false,
}: {
  configured: boolean;
  reset?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState("");
  const [recovery, setRecovery] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState<{ error: boolean; text: string } | null>(
      null,
    );
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      if (reset) {
        if (password.length < 12)
          throw new Error("Use at least 12 characters for your password.");
        if (password !== confirmation)
          throw new Error("The passwords do not match.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error)
          throw new Error(
            "The password could not be updated. Request a new recovery link and try again.",
          );
        await supabase.auth.signOut();
        router.replace("/admin/login?updated=1");
        router.refresh();
      } else if (recovery) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/admin/reset-password`,
        });
        if (error)
          throw new Error(
            "The recovery request could not be sent. Please try again later.",
          );
        setMessage({
          error: false,
          text: "If this is the owner account, you’ll receive a recovery link. Open it in this browser to set a new password.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error)
          throw new Error("Sign-in failed. Check your email and password.");
        const owner = await supabase
          .from("portfolio_owner")
          .select("user_id")
          .maybeSingle();
        if (owner.error || !owner.data) {
          await supabase.auth.signOut();
          throw new Error("This account does not have editing access.");
        }
        router.replace("/admin");
        router.refresh();
      }
    } catch (error) {
      setMessage({
        error: true,
        text:
          error instanceof Error
            ? error.message
            : "The connection was interrupted. Please retry.",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <aside className="auth-art">
        <a href="/" className="monogram">
          PA<span>.</span>
        </a>
        <div>
          <span className="eyebrow">Your personal portfolio studio</span>
          <h2>
            A career story.
            <br />
            Written by you.
          </h2>
          <p>
            Keep your experience, skills, projects, and resume in step with your
            next chapter.
          </p>
        </div>
        <span className="eyebrow">ParikshitAbuj.com</span>
      </aside>
      <main className="auth-form-wrap">
        <div className="auth-form">
          <span className="eyebrow">
            <LockKeyhole size={15} />
            Owner access
          </span>
          <h1>
            {reset
              ? "Set a new password."
              : recovery
                ? "Recover your account."
                : "Welcome back."}
          </h1>
          <p>
            {reset
              ? "Choose a strong password for your private editor."
              : recovery
                ? "Enter your owner email to request a recovery link."
                : "Sign in to edit your portfolio and keep your resume up to date."}
          </p>
          {!configured && (
            <div className="message info">
              The editor needs its database connection. Follow the repository’s
              local setup instructions first.
            </div>
          )}
          {message && (
            <div
              className={`message ${message.error ? "error" : "success"}`}
              role={message.error ? "alert" : "status"}
            >
              {message.text}
            </div>
          )}
          <form onSubmit={submit}>
            {!reset && (
              <label className="field">
                <span>Email address</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={busy || !configured}
                />
              </label>
            )}
            {!recovery && (
              <label className="field">
                <span>{reset ? "New password" : "Password"}</span>
                <input
                  name="password"
                  type="password"
                  autoComplete={reset ? "new-password" : "current-password"}
                  minLength={reset ? 12 : undefined}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={busy || !configured}
                />
              </label>
            )}
            {reset && (
              <label className="field">
                <span>Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  disabled={busy}
                />
              </label>
            )}
            <button className="button primary" disabled={busy || !configured}>
              {busy
                ? "Please wait…"
                : reset
                  ? "Update password"
                  : recovery
                    ? "Send recovery link"
                    : "Sign in"}
              <ArrowRight size={16} />
            </button>
          </form>
          <div className="auth-footer">
            {!reset && (
              <button
                disabled={busy}
                onClick={() => {
                  setRecovery(!recovery);
                  setMessage(null);
                }}
              >
                {recovery ? "Return to sign in" : "Forgot your password?"}
              </button>
            )}
            <a href="/">← Back to public portfolio</a>
          </div>
        </div>
      </main>
    </div>
  );
}
