import { getDraft, requireOwner } from "@/lib/data";
import { Studio } from "@/components/studio";
export default async function Admin() {
  const supabase = await requireOwner();
  const [draft, published] = await Promise.all([
    getDraft(),
    supabase
      .from("published_portfolio")
      .select("source_revision, published_at")
      .eq("id", true)
      .maybeSingle(),
  ]);
  if (published.error)
    throw new Error("The publication status could not be loaded.");
  return <Studio initialDraft={draft} initialPublished={published.data} />;
}
