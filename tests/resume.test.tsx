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
it("aligns contact links on one baseline and places entry dates and locations at the right", async () => {
  const content = structuredClone(fixture);
  content.profile.phone = "+91 9529138839";
  content.profile.linkedin = "https://linkedin.com/in/example";
  content.experiences[0].location = "Pune";
  content.education[0].location = "Nagpur";
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loading = getDocument({
    data: new Uint8Array(await renderResumeBuffer(content)),
    useSystemFonts: true,
  });
  const document = await loading.promise;
  const page = await document.getPage(1);
  const items = (await page.getTextContent()).items.filter(
    (item) => "str" in item,
  );
  function text(value: string) {
    const item =
      items.find((item) => item.str.trim() === value) ??
      items.find((item) => item.str.includes(value));
    expect(item, value).toBeDefined();
    return item!;
  }
  const email = text(content.profile.email);
  for (const value of [content.profile.phone, "LinkedIn", "GitHub"])
    expect(text(value).transform[5]).toBeCloseTo(email.transform[5], 1);
  const date = text("Jan 2026 - May 2026");
  const location = text("Pune");
  expect(date.transform[5]).toBeCloseTo(
    text("Example Company").transform[5],
    0,
  );
  expect(location.transform[5]).toBeCloseTo(text("Developer").transform[5], 0);
  for (const value of ["Pune", "Nagpur", "2022 - 2026"])
    expect(text(value).transform[4] + text(value).width).toBeCloseTo(
      date.transform[4] + date.width,
      1,
    );
  expect(text("Nagpur").transform[5]).toBeCloseTo(
    text("Example Institute").transform[5],
    0,
  );
  expect(text("2022 - 2026").transform[5]).toBeCloseTo(
    text("B.Tech, Computer Science").transform[5],
    0,
  );
  const links = (await page.getAnnotations()).map(
    (annotation) => annotation.url,
  );
  expect(links).toEqual(
    expect.arrayContaining([
      `mailto:${content.profile.email}`,
      content.profile.github,
      content.profile.linkedin,
    ]),
  );
  await loading.destroy();
});
it("keeps long names, links, entry headings and dates inside the page", async () => {
  const content = structuredClone(fixture);
  content.profile.name = "Parikshit ".repeat(9).trim();
  content.profile.github = `https://github.com/example/${"repository".repeat(80)}`;
  content.projects[0].githubUrl = content.profile.github;
  content.projects[0].name =
    "A long project title covering workflows, integration, inventory, billing and reporting";
  content.projects[0].startDate = "2026-01";
  content.projects[0].endDate = "2026-12";
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loading = getDocument({
    data: new Uint8Array(await renderResumeBuffer(content)),
    useSystemFonts: true,
  });
  const doc = await loading.promise;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const width = page.getViewport({ scale: 1 }).width;
    for (const item of (await page.getTextContent()).items)
      if ("str" in item && item.str.trim()) {
        expect(item.transform[4], item.str).toBeGreaterThanOrEqual(35);
        expect(item.transform[4] + item.width, item.str).toBeLessThanOrEqual(
          width - 35,
        );
      }
  }
  await loading.destroy();
});
it("renders optional qualifications and dates with readable text order and omits empty placeholders", async () => {
  const content = structuredClone(fixture);
  Object.assign(content.education[0], {
    board: "Example University",
    location: "Pune",
    resultType: "CGPA",
    resultValue: "8.2",
    resultScale: "10",
    highlights: ["Academic distinction"],
  });
  Object.assign(content.projects[0], {
    startDate: "2026-01",
    endDate: "2026-06",
  });
  content.certifications[0].credentialId = "SQL-123";
  content.languages[0].proficiency = "Professional";
  const text = (await extracted(await renderResumeBuffer(content))).join(" ");
  for (const value of [
    "CGPA: 8.2/10",
    "Example University",
    "Pune",
    "Academic distinction",
    "Jan 2026 - Jun 2026",
    "Credential ID: SQL-123",
    "English: Professional",
  ])
    expect(text).toContain(value);
  expect(text.indexOf("Example Institute")).toBeLessThan(
    text.indexOf("B.Tech, Computer Science"),
  );
  const plain = (await extracted(await renderResumeBuffer(fixture))).join(" ");
  expect(plain).not.toMatch(/undefined|CGPA:|Credential ID:|Not specified/);
});
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

it("lets oversized education and project entries continue without losing their final content", async () => {
  const content = structuredClone(fixture);
  content.education[0].highlights = Array.from({ length: 10 }, (_, i) =>
    `Academic highlight ${i}: `.padEnd(295, " verified coursework"),
  );
  content.projects[0].bullets = Array.from({ length: 30 }, (_, i) =>
    `Project workflow ${i}: `.padEnd(1190, " tested application integration"),
  );
  const pages = await extracted(await renderResumeBuffer(content));
  const text = pages.join(" ");
  expect(pages.length).toBeGreaterThan(2);
  expect(text).toContain("Academic highlight 9:");
  expect(text).toContain("Project workflow 29:");
  expect(text).toContain("Certifications");
});
