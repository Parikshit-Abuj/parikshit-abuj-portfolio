import { renderToBuffer } from "@react-pdf/renderer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ResumeDocument } from "../components/resume-document";
import type { PortfolioContent } from "./portfolio";

export async function renderResumeBuffer(
  content: PortfolioContent,
): Promise<Buffer> {
  const rendered = await renderToBuffer(<ResumeDocument content={content} />);
  const document = await PDFDocument.load(rendered);
  const font = await document.embedFont(StandardFonts.TimesRoman);
  const pages = document.getPages();
  // Add footers after pagination. React PDF's automatic fixed footer layout can
  // overflow or clip dynamic page numbers; PDF coordinates stay stable here.
  if (pages.length > 1)
    pages.forEach((page, index) => {
      const width = page.getWidth();
      const color = rgb(0, 0, 0);
      const label = `${index + 1} / ${pages.length}`;
      // Page numbers are decorative; identity and contact remain ordinary body text.
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
