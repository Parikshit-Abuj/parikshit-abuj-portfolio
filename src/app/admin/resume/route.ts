import { getDraft } from "@/lib/data";
import { makeResume, resumeFileName } from "@/lib/resume";
import { PDFDocument } from "pdf-lib";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const draft = await getDraft();
  try {
    const buffer = await makeResume(draft.content);
    const pageCount = (await PDFDocument.load(buffer)).getPageCount();
    if (new URL(request.url).searchParams.get("info") === "1")
      return Response.json(
        { pageCount, revision: draft.revision },
        {
          headers: {
            "Cache-Control": "private, no-store",
            "X-Robots-Tag": "noindex, nofollow",
          },
        },
      );
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${resumeFileName(draft.content, true)}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "X-PDF-Page-Count": String(pageCount),
      },
    });
  } catch {
    return Response.json(
      { error: "The draft resume could not be generated. Please try again." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
