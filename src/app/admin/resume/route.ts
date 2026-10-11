import { getDraft } from "@/lib/data";
import { makeResume, resumeFileName } from "@/lib/resume";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const draft = await getDraft();
  try {
    const buffer = await makeResume(draft.content);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${resumeFileName(draft.content, true)}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return Response.json(
      { error: "The draft resume could not be generated. Please try again." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
