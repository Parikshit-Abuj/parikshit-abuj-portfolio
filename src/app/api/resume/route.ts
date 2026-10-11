import { getPublished } from "@/lib/data";
import { makeResume, resumeFileName } from "@/lib/resume";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const snapshot = await getPublished();
    if (!snapshot) return Response.json({ error: "No resume has been published yet." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    const buffer = await makeResume(snapshot.content);
    return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${resumeFileName(snapshot.content)}"`, "Cache-Control": "no-store", "X-Portfolio-Revision": String(snapshot.source_revision) } });
  } catch { return Response.json({ error: "The resume could not be generated. Please try again shortly." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
