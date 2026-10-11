import { describe, expect, it } from "vitest";
import {
  portfolioSchema,
  publicContent,
  experiencePeriod,
  educationPeriod,
  newEntry,
  academicResult,
} from "../src/lib/portfolio";
import { fixture } from "./fixtures";
describe("portfolio content contract", () => {
  it("validates academic results without converting scales or requiring optional fields", () => {
    const content = structuredClone(fixture);
    Object.assign(content.education[0], {
      resultType: "CGPA",
      resultValue: "8.2",
      resultScale: "10",
      board: "Example University",
      highlights: ["Academic distinction"],
    });
    expect(portfolioSchema.safeParse(content).success).toBe(true);
    expect(academicResult(content.education[0])).toBe("CGPA: 8.2/10");
    content.education[0].resultValue = "10.1";
    expect(portfolioSchema.safeParse(content).success).toBe(false);
    Object.assign(content.education[0], {
      resultType: "Percentage",
      resultValue: "85",
      resultScale: "",
    });
    expect(academicResult(content.education[0])).toBe("Percentage: 85%");
    expect(portfolioSchema.safeParse(content).success).toBe(true);
    content.education[0].resultValue = "101";
    expect(portfolioSchema.safeParse(content).success).toBe(false);
    Object.assign(content.education[0], {
      resultType: "Grade",
      resultValue: "A",
      resultScale: "",
    });
    expect(portfolioSchema.safeParse(content).success).toBe(true);
    Object.assign(content.education[0], {
      resultType: "",
      resultValue: "",
      resultScale: "",
    });
    expect(academicResult(content.education[0])).toBe("");
    expect(portfolioSchema.safeParse(content).success).toBe(true);
  });
  it("rejects incomplete results, reversed project dates, and unknown proficiency", () => {
    const content = structuredClone(fixture);
    content.education[0].resultType = "CGPA";
    expect(portfolioSchema.safeParse(content).success).toBe(false);
    content.education[0].resultType = "";
    content.projects[0].startDate = "2026-05";
    content.projects[0].endDate = "2026-01";
    expect(portfolioSchema.safeParse(content).success).toBe(false);
    content.projects[0].endDate = "2026-06";
    expect(portfolioSchema.safeParse(content).success).toBe(true);
    expect(
      portfolioSchema.safeParse({
        ...content,
        languages: [{ ...content.languages[0], proficiency: "Expert" }],
      }).success,
    ).toBe(false);
  });
  it("accepts a complete profile and optional empty sections", () => {
    expect(portfolioSchema.safeParse(fixture).success).toBe(true);
    expect(
      portfolioSchema.safeParse({
        ...fixture,
        projects: [],
        education: [],
        languages: [],
      }).success,
    ).toBe(true);
  });
  it("rejects executable links and invalid contact email", () => {
    expect(
      portfolioSchema.safeParse({
        ...fixture,
        profile: { ...fixture.profile, github: "javascript:alert(1)" },
      }).success,
    ).toBe(false);
    expect(
      portfolioSchema.safeParse({
        ...fixture,
        profile: { ...fixture.profile, email: "not-an-email" },
      }).success,
    ).toBe(false);
  });
  it("rejects reversed dates and ongoing roles with an end date", () => {
    const invalid = structuredClone(fixture);
    invalid.experiences[0].endDate = "2025-01";
    expect(portfolioSchema.safeParse(invalid).success).toBe(false);
    invalid.experiences[0].endDate = "2026-05";
    invalid.experiences[0].current = true;
    expect(portfolioSchema.safeParse(invalid).success).toBe(false);
  });
  it("filters hidden entries consistently without mutating the draft", () => {
    const hidden = structuredClone(fixture);
    hidden.projects[0].visible = false;
    hidden.skillGroups[0].visible = false;
    const projected = publicContent(hidden);
    expect(projected.projects).toHaveLength(0);
    expect(projected.skillGroups).toHaveLength(0);
    expect(hidden.projects).toHaveLength(1);
  });
  it("changes profession while preserving historical job titles", () => {
    const qa = structuredClone(fixture);
    qa.profile.title = "QA Engineer";
    expect(portfolioSchema.parse(qa).profile.title).toBe("QA Engineer");
    expect(qa.experiences[0].role).toBe("Developer");
  });
  it("formats ongoing and year-only dates", () => {
    expect(
      experiencePeriod({
        ...fixture.experiences[0],
        current: true,
        endDate: "",
      }),
    ).toBe("Jan 2026 - Present");
    expect(educationPeriod({ ...fixture.education[0], startYear: "" })).toBe(
      "2026",
    );
  });
  it("creates independent stable IDs for all entry types", () => {
    for (const key of [
      "projects",
      "experiences",
      "skillGroups",
      "education",
      "certifications",
      "languages",
    ] as const)
      expect(newEntry(key).id).not.toBe(newEntry(key).id);
  });
});

it("filters nested custom privacy and normalizes independent layout orders", () => {
  const content = structuredClone(fixture);
  const entry = {
    id: crypto.randomUUID(),
    visible: true,
    title: "Award",
    organization: "",
    date: "2026",
    description: "",
    bullets: [],
    url: "",
  };
  content.customSections = [
    {
      id: crypto.randomUUID(),
      visible: true,
      title: "Achievements",
      showOnWebsite: false,
      showOnResume: true,
      entries: [
        entry,
        {
          ...entry,
          id: crypto.randomUUID(),
          visible: false,
          title: "Hidden entry",
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      visible: false,
      title: "Hidden section",
      showOnWebsite: true,
      showOnResume: true,
      entries: [entry],
    },
  ];
  content.resume = {
    sectionOrder: [
      `custom:${content.customSections[1].id}`,
      "projects",
      "projects",
      "unknown",
    ],
  };
  const projected = publicContent(content);
  expect(projected.customSections).toHaveLength(1);
  expect(projected.customSections![0].entries).toHaveLength(1);
  expect(JSON.stringify(projected)).not.toContain("Hidden");
  expect(projected.resume!.sectionOrder).not.toContain(
    `custom:${content.customSections[1].id}`,
  );
});
