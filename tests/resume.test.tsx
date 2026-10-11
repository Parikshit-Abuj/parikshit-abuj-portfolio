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

async function extracted(pdf: Buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loading = getDocument({
    data: new Uint8Array(pdf),
    useSystemFonts: true,
  });
  const document = await loading.promise;
  const pages = [];
  for (let i = 1; i <= document.numPages; i++) {
    const page = await document.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .filter((item) => "str" in item)
        .map((item) => (item as { str: string }).str)
        .join(" "),
    );
  }
  await loading.destroy();
  return pages;
}
it("extracts education and ordered custom content while excluding hidden and website-only entries", async () => {
  const content = structuredClone(fixture);
  content.education = [
    ...fixture.education,
    {
      ...fixture.education[0],
      id: crypto.randomUUID(),
      qualification: "Higher Secondary Certificate (12th)",
    },
    {
      ...fixture.education[0],
      id: crypto.randomUUID(),
      qualification: "Secondary School Certificate (10th)",
    },
  ];
  const entry = {
    id: crypto.randomUUID(),
    visible: true,
    title: "Engineering award",
    organization: "Engineering Society",
    date: "2026",
    description: "Recognized for a tested application.",
    bullets: ["Built a reliable workflow."],
    url: "https://example.com/award",
  };
  content.customSections = [
    {
      id: crypto.randomUUID(),
      visible: true,
      title: "Achievements",
      showOnResume: true,
      showOnWebsite: false,
      entries: [
        entry,
        {
          ...entry,
          id: crypto.randomUUID(),
          visible: false,
          title: "Hidden accomplishment",
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      visible: true,
      title: "Website only",
      showOnResume: false,
      showOnWebsite: true,
      entries: [
        { ...entry, id: crypto.randomUUID(), title: "Website content" },
      ],
    },
  ];
  content.resume = {
    sectionOrder: [
      `custom:${content.customSections[0].id}`,
      "projects",
      "education",
    ],
  };
  const pages = await extracted(await renderResumeBuffer(content));
  const text = pages.join(" ");
  expect(text).toContain(fixture.profile.name);
  expect(text).toContain(fixture.profile.email);
  expect(text).toContain("Higher Secondary Certificate (12th)");
  expect(text).toContain("Secondary School Certificate (10th)");
  expect(text).toContain("Engineering award");
  expect(text).not.toContain("Hidden accomplishment");
  expect(text).not.toContain("Website content");
  expect(text.indexOf("Achievements")).toBeLessThan(text.indexOf("Projects"));
  expect(text.indexOf("Projects")).toBeLessThan(text.indexOf("Education"));
  for (const page of pages) {
    expect(page.trim()).not.toMatch(
      /(?:Projects|Experience|Achievements|Education)\s+\d+\s+\/\s+\d+$/,
    );
  }
});

it("retains maximum-length skills across pages without shrinking or clipping", async () => {
  const content = structuredClone(fixture);
  content.skillGroups[0].skills = Array.from({ length: 60 }, (_, i) =>
    `Technology ${i}: database operations and application testing `.padEnd(
      100,
      " workflow",
    ),
  );
  content.resume = { sectionOrder: ["skillGroups", "summary"] };
  const pages = await extracted(await renderResumeBuffer(content));
  const text = pages.join(" ");
  expect(pages.length).toBeGreaterThan(1);
  expect(text).toContain("Technology 0:");
  expect(text).toContain("Technology 59:");
  expect(text).toContain("Professional Summary");
});
