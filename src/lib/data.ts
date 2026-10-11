import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, isConfigured } from "@/lib/supabase/server";
import {
  portfolioSchema,
  type PortfolioDraft,
  type PortfolioSnapshot,
} from "@/lib/portfolio";

export const getPublished = cache(
  async (): Promise<PortfolioSnapshot | null> => {
    if (!isConfigured()) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("published_portfolio")
      .select("content, source_revision, published_at")
      .eq("id", true)
      .maybeSingle();
    if (error)
      throw new Error(
        "The portfolio is temporarily unavailable. Please try again shortly.",
      );
    if (!data) return null;
    return { ...data, content: portfolioSchema.parse(data.content) };
  },
);

export async function ownerClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) throw new Error("Please sign in again.");
  const owner = await supabase
    .from("portfolio_owner")
    .select("user_id")
    .eq("user_id", data.claims.sub)
    .maybeSingle();
  if (owner.error || !owner.data)
    throw new Error("This account does not have editing access.");
  return supabase;
}

export async function requireOwner() {
  try {
    return await ownerClient();
  } catch {
    redirect("/admin/login");
  }
}
export async function getDraft(): Promise<PortfolioDraft> {
  const supabase = await requireOwner();
  const { data, error } = await supabase
    .from("portfolio_draft")
    .select("content, revision, updated_at")
    .eq("id", true)
    .single();
  if (error || !data)
    throw new Error(
      "Your draft could not be loaded. Check the database setup and try again.",
    );
  return { ...data, content: portfolioSchema.parse(data.content) };
}
