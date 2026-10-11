"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ownerClient } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import {
  friendlyValidation,
  portfolioSchema,
  publicContent,
  type PortfolioContent,
} from "@/lib/portfolio";
import { makeResume } from "@/lib/resume";
type Result<T> = { ok: true; data: T } | { ok: false; error: string };
function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please retry.";
}
function normalize(content: unknown) {
  const copy = structuredClone(content) as PortfolioContent;
  if (Array.isArray(copy?.customSections))
    for (const section of copy.customSections)
      if (Array.isArray(section.entries))
        for (const entry of section.entries)
          if (Array.isArray(entry.bullets))
            entry.bullets = entry.bullets.filter(
              (value) => typeof value !== "string" || value.trim().length > 0,
            );
  if (copy && typeof copy === "object")
    for (const key of ["projects", "experiences", "skillGroups"] as const) {
      if (Array.isArray(copy[key]))
        for (const entry of copy[key])
          for (const property of [
            "bullets",
            "skills",
            "technologies",
          ] as const) {
            if (property in entry) {
              const record = entry as unknown as Record<string, unknown>;
              if (Array.isArray(record[property]))
                record[property] = (record[property] as unknown[]).filter(
                  (value) =>
                    typeof value !== "string" || value.trim().length > 0,
                );
            }
          }
    }
  return copy;
}
export async function saveDraftAction(
  content: unknown,
  revision: number,
): Promise<
  Result<{ content: PortfolioContent; revision: number; updatedAt: string }>
> {
  try {
    const supabase = await ownerClient();
    if (!Number.isSafeInteger(revision) || revision < 1)
      throw new Error("Reload the editor before saving.");
    const parsed = portfolioSchema.safeParse(normalize(content));
    if (!parsed.success)
      return { ok: false, error: friendlyValidation(parsed.error) };
    if (parsed.data.profile.photoPath) {
      const claims = await supabase.auth.getClaims();
      if (
        !parsed.data.profile.photoPath.startsWith(`${claims.data?.claims.sub}/`)
      )
        return {
          ok: false,
          error: "The portrait must belong to your account.",
        };
    }
    const { data, error } = await supabase.rpc("save_portfolio_draft", {
      new_content: parsed.data,
      expected_revision: revision,
    });
    if (error)
      throw new Error(
        ["PT409", "40001"].includes(error.code)
          ? "Your draft changed in another tab. Copy any unsaved edits, then reload this page."
          : "The draft could not be saved. Your edits are still here; please retry.",
      );
    revalidatePath("/admin/preview");
    return {
      ok: true,
      data: {
        content: parsed.data,
        revision: data as number,
        updatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}
export async function publishAction(
  revision: number,
): Promise<Result<{ revision: number; publishedAt: string }>> {
  try {
    const supabase = await ownerClient();
    const draft = await supabase
      .from("portfolio_draft")
      .select("content, revision")
      .eq("id", true)
      .single();
    if (draft.error || !draft.data)
      throw new Error("Your draft could not be loaded.");
    if (draft.data.revision !== revision)
      throw new Error(
        "Your draft changed in another tab. Reload before publishing.",
      );
    const parsed = portfolioSchema.safeParse(draft.data.content);
    if (!parsed.success)
      return { ok: false, error: friendlyValidation(parsed.error) };
    await makeResume(publicContent(parsed.data));
    const { data, error } = await supabase.rpc("publish_portfolio", {
      expected_revision: revision,
    });
    if (error)
      throw new Error(
        ["PT409", "40001"].includes(error.code)
          ? "Your draft changed while publishing. Reload and try again."
          : "Publishing failed. The previous public version is still available.",
      );
    revalidatePath("/");
    const published = await supabase
      .from("published_portfolio")
      .select("published_at")
      .eq("id", true)
      .single();
    return {
      ok: true,
      data: {
        revision: data as number,
        publishedAt: published.data?.published_at ?? new Date().toISOString(),
      },
    };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
