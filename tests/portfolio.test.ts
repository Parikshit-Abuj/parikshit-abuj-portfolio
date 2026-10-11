import { describe, expect, it } from "vitest";
import {
  portfolioSchema,
  publicContent,
  experiencePeriod,
  educationPeriod,
  newEntry,
} from "../src/lib/portfolio";
import { fixture } from "./fixtures";
describe("portfolio content contract", () => {
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
