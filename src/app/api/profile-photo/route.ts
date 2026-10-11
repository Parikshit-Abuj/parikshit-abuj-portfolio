import { getPublished } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const snapshot = await getPublished();
    const path = snapshot?.content.profile.photoPath;
    if (!path) return new Response(null, { status: 404 });
    const client = await createClient();
    const { data, error } = await client.storage
      .from("portfolio-media")
      .download(path);
    if (error || !data) return new Response(null, { status: 404 });
    return new Response(data, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Portfolio-Revision": String(snapshot.source_revision),
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
