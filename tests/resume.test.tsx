import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResumeDocument } from "../src/components/resume-document";
import { fixture } from "./fixtures";
describe("resume rendering", () => {
  it("produces a real PDF with links", async () => {
    const pdf = await renderToBuffer(<ResumeDocument content={fixture} />);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-"); expect(pdf.length).toBeGreaterThan(2000);
    expect(pdf.toString("latin1")).toContain("/URI");
  });
  it("paginates long experience instead of clipping it to one page", async () => {
    const long = structuredClone(fixture);
    long.experiences = Array.from({ length: 15 }, (_, i) => ({ ...fixture.experiences[0], id: crypto.randomUUID(), company: `Employer ${i}`, bullets: Array(5).fill("Implemented and tested application features, documented problems, and coordinated reliable fixes across teams.") }));
    const pdf = await renderToBuffer(<ResumeDocument content={long} />);
    expect((pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
  });
});
