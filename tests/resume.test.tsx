import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderResumeBuffer } from "../src/lib/resume-renderer";
import { fixture } from "./fixtures";
describe("resume rendering", () => {
  it("produces a real PDF with links", async () => {
    const pdf = await renderResumeBuffer(fixture);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
    const document = await PDFDocument.load(pdf);
    expect(document.getPages()[0].node.Annots()?.size()).toBeGreaterThan(0);
    expect(document.getPages()[0].getWidth()).toBeCloseTo(595.28, 1);
  });
  it("paginates long experience instead of clipping it to one page", async () => {
    const long = structuredClone(fixture);
    long.experiences = Array.from({ length: 15 }, (_, i) => ({
      ...fixture.experiences[0],
      id: crypto.randomUUID(),
      company: `Employer ${i}`,
      bullets: Array(5).fill(
        "Implemented and tested application features, documented problems, and coordinated reliable fixes across teams.",
      ),
    }));
    const pdf = await renderResumeBuffer(long);
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(1);
  });
});
