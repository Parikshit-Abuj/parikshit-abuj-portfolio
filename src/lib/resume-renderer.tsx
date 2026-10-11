import { renderToBuffer } from "@react-pdf/renderer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ResumeDocument } from "../components/resume-document";
import type { PortfolioContent } from "./portfolio";

export async function renderResumeBuffer(
  content: PortfolioContent,
): Promise<Buffer> {
  const rendered = await renderToBuffer(<ResumeDocument content={content} />);
  const document = await PDFDocument.load(rendered);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const pages = document.getPages();
  // Add footers after pagination. React PDF's automatic fixed footer layout can
  // overflow or clip dynamic page numbers; PDF coordinates stay stable here.
  pages.forEach((page, index) => {
    const width = page.getWidth();
    const color = rgb(0, 0, 0);
    const label = `${index + 1} / ${pages.length}`;
    page.drawLine({
      start: { x: 38, y: 38 },
      end: { x: width - 38, y: 38 },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.75),
    });
    // Helvetica supports the characters used here; the name remains in the
    // React PDF body/header, which owns content font handling.
    page.drawText(label, {
      x: width - 38 - font.widthOfTextAtSize(label, 7),
      y: 24,
      size: 7,
      font,
      color,
    });
  });
  return Buffer.from(await document.save());
}
