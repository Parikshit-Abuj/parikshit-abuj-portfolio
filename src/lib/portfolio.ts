import { z } from "zod";

const text = (limit = 200) => z.string().trim().max(limit);
const required = (limit = 200) => text(limit).min(1, "This field is required.");
const link = text(1000).refine((value) => {
  if (!value) return true;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, "Enter a complete http:// or https:// URL.");
const month = text(7).refine(
  (value) => !value || /^\d{4}-(0[1-9]|1[0-2])$/.test(value),
  "Use YYYY-MM.",
);
const year = text(4).refine(
  (value) => !value || /^(19|20)\d{2}$/.test(value),
  "Use a four-digit year.",
);
const item = { id: z.string().uuid(), visible: z.boolean() };
const bullets = z.array(required(1200)).max(30);
export const resumeDefaults = [
  "summary",
  "skillGroups",
  "experiences",
  "projects",
  "education",
  "certifications",
  "languages",
];
export const websiteDefaults = [
  "projects",
  "experiences",
  "skillGroups",
  "credentials",
];
const order = z.object({
  sectionOrder: z.array(required(100)).max(40).default([]),
});
const customEntrySchema = z.object({
  ...item,
  title: required(200),
  organization: text(200),
  date: text(100),
  description: text(3000),
  bullets,
  url: link,
});

export const portfolioSchema = z.object({
  schemaVersion: z.literal(1),
  profile: z.object({
    name: required(100),
    title: required(120),
    summary: required(2000),
    email: z.string().trim().email().max(200),
    phone: text(40),
    location: text(100),
    availability: text(100),
    github: link,
    linkedin: link,
    photoPath: z
      .string()
      .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i)
      .optional(),
  }),
  resume: order.optional(),
  website: order.optional(),
  customSections: z
    .array(
      z.object({
        ...item,
        title: required(100),
        showOnWebsite: z.boolean(),
        showOnResume: z.boolean(),
        entries: z
          .array(customEntrySchema)
          .max(100)
          .refine(
            (entries) =>
              new Set(entries.map((e) => e.id)).size === entries.length,
            "Entry IDs must be unique within a section.",
          ),
      }),
    )
    .max(20)
    .refine(
      (sections) => new Set(sections.map((s) => s.id)).size === sections.length,
      "Section IDs must be unique.",
    )
    .optional(),
  skillGroups: z
    .array(
      z.object({
        ...item,
        name: required(100),
        skills: z.array(required(100)).max(60),
      }),
    )
    .max(30),
  experiences: z
    .array(
      z
        .object({
          ...item,
          company: required(150),
          role: required(150),
          location: text(100),
          startDate: month,
          endDate: month,
          current: z.boolean(),
          bullets,
        })
        .refine((entry) => !entry.current || !entry.endDate, {
          message: "An ongoing role cannot have an end date.",
          path: ["endDate"],
        })
        .refine(
          (entry) =>
            !entry.startDate ||
            !entry.endDate ||
            entry.endDate >= entry.startDate,
          { message: "End date must be after start date.", path: ["endDate"] },
        ),
    )
    .max(100),
  projects: z
    .array(
      z
        .object({
          ...item,
          name: required(150),
          summary: required(3000),
          technologies: z.array(required(80)).max(40),
          bullets,
          demoUrl: link,
          githubUrl: link,
          featured: z.boolean(),
          status: z.enum(["", "In progress", "Completed"]),
          startDate: month.optional(),
          endDate: month.optional(),
        })
        .refine(
          (entry) =>
            !entry.startDate ||
            !entry.endDate ||
            entry.endDate >= entry.startDate,
          {
            message: "End date must be after start date.",
            path: ["endDate"],
          },
        ),
    )
    .max(100),
  education: z
    .array(
      z
        .object({
          ...item,
          qualification: required(180),
          institution: required(180),
          startYear: year,
          endYear: year,
          board: text(180).optional(),
          location: text(100).optional(),
          resultType: z.enum(["", "CGPA", "Percentage", "Grade"]).optional(),
          resultValue: text(40).optional(),
          resultScale: text(20).optional(),
          highlights: z.array(required(300)).max(10).optional(),
        })
        .superRefine((entry, ctx) => {
          const kind = entry.resultType || "",
            value = entry.resultValue || "",
            scale = entry.resultScale || "";
          if (!kind && !value && !scale) return;
          const issue = (message: string, path: string) =>
            ctx.addIssue({ code: "custom", message, path: [path] });
          if (!kind) issue("Choose a result type.", "resultType");
          if (!value) issue("Enter the academic result.", "resultValue");
          if (
            kind === "Percentage" &&
            (!/^\d+(\.\d+)?$/.test(value) || Number(value) > 100)
          )
            issue("Percentage must be between 0 and 100.", "resultValue");
          if (kind === "CGPA") {
            if (!/^\d+(\.\d+)?$/.test(scale) || Number(scale) <= 0)
              issue("Enter a positive CGPA scale.", "resultScale");
            if (!/^\d+(\.\d+)?$/.test(value) || Number(value) > Number(scale))
              issue("CGPA must be between 0 and its scale.", "resultValue");
          }
          if (kind !== "CGPA" && scale)
            issue("A scale is only used for CGPA.", "resultScale");
        })
        .refine(
          (entry) =>
            !entry.startYear ||
            !entry.endYear ||
            entry.endYear >= entry.startYear,
          { message: "End year must be after start year.", path: ["endYear"] },
        ),
    )
    .max(50),
  certifications: z
    .array(
      z.object({
        ...item,
        name: required(200),
        issuer: text(150),
        year,
        url: link,
        credentialId: text(150).optional(),
      }),
    )
    .max(100),
  languages: z
    .array(
      z.object({
        ...item,
        name: required(80),
        proficiency: z
          .enum([
            "",
            "Native",
            "Fluent",
            "Professional",
            "Conversational",
            "Basic",
          ])
          .optional(),
      }),
    )
    .max(30),
});

export type PortfolioContent = z.infer<typeof portfolioSchema>;
export type CollectionKey =
  | "projects"
  | "experiences"
  | "skillGroups"
  | "education"
  | "certifications"
  | "languages";
export type CustomSection = NonNullable<
  PortfolioContent["customSections"]
>[number];
export function sectionOrder(
  content: PortfolioContent,
  channel: "resume" | "website",
) {
  const defaults = channel === "resume" ? resumeDefaults : websiteDefaults;
  const custom = (content.customSections ?? []).map(
    (section) => `custom:${section.id}`,
  );
  const valid = [...defaults, ...custom];
  const fallback =
    channel === "resume"
      ? [...defaults.slice(0, -1), ...custom, "languages"]
      : valid;
  const requested = content[channel]?.sectionOrder ?? [];
  return [
    ...new Set([...requested.filter((id) => valid.includes(id)), ...fallback]),
  ];
}
export function newCustomEntry(): CustomSection["entries"][number] {
  return {
    id: crypto.randomUUID(),
    visible: true,
    title: "",
    organization: "",
    date: "",
    description: "",
    bullets: [],
    url: "",
  };
}
export type PortfolioSnapshot = {
  content: PortfolioContent;
  source_revision: number;
  published_at: string;
};
export type PortfolioDraft = {
  content: PortfolioContent;
  revision: number;
  updated_at: string;
};

export const collectionLabels: Record<CollectionKey, string> = {
  projects: "Projects",
  experiences: "Experience",
  skillGroups: "Skills",
  education: "Education",
  certifications: "Certifications",
  languages: "Languages",
};

export function newEntry(key: CollectionKey) {
  const base = { id: crypto.randomUUID(), visible: true };
  switch (key) {
    case "projects":
      return {
        ...base,
        name: "",
        summary: "",
        technologies: [],
        bullets: [],
        demoUrl: "",
        githubUrl: "",
        featured: false,
        status: "In progress" as const,
      };
    case "experiences":
      return {
        ...base,
        company: "",
        role: "",
        location: "",
        startDate: "",
        endDate: "",
        current: false,
        bullets: [],
      };
    case "skillGroups":
      return { ...base, name: "", skills: [] };
    case "education":
      return {
        ...base,
        qualification: "",
        institution: "",
        startYear: "",
        endYear: "",
      };
    case "certifications":
      return { ...base, name: "", issuer: "", year: "", url: "" };
    case "languages":
      return { ...base, name: "" };
  }
}

export function publicContent(content: PortfolioContent): PortfolioContent {
  const customSections = (content.customSections ?? [])
    .filter(
      (section) =>
        section.visible && (section.showOnWebsite || section.showOnResume),
    )
    .map((section) => ({
      ...section,
      entries: section.entries.filter((entry) => entry.visible),
    }));
  const cleanOrder = (channel: "resume" | "website") =>
    content[channel]
      ? {
          sectionOrder: content[channel]!.sectionOrder.filter(
            (id) =>
              !id.startsWith("custom:") ||
              customSections.some((s) => `custom:${s.id}` === id),
          ),
        }
      : undefined;
  return {
    ...content,
    customSections,
    resume: cleanOrder("resume"),
    website: cleanOrder("website"),
    ...Object.fromEntries(
      Object.keys(collectionLabels).map((key) => [
        key,
        content[key as CollectionKey].filter((entry) => entry.visible),
      ]),
    ),
  };
}

export function formatMonth(value: string): string {
  if (!value) return "";
  return new Date(`${value}-01T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
export function experiencePeriod(
  entry: PortfolioContent["experiences"][number],
) {
  return [
    formatMonth(entry.startDate),
    entry.current ? "Present" : formatMonth(entry.endDate),
  ]
    .filter(Boolean)
    .join(" - ");
}
export function educationPeriod(entry: PortfolioContent["education"][number]) {
  return [entry.startYear, entry.endYear].filter(Boolean).join(" - ");
}
export function academicResult(entry: PortfolioContent["education"][number]) {
  if (!entry.resultType || !entry.resultValue) return "";
  if (entry.resultType === "CGPA")
    return `CGPA: ${entry.resultValue}/${entry.resultScale}`;
  if (entry.resultType === "Percentage")
    return `Percentage: ${entry.resultValue}%`;
  return `Grade: ${entry.resultValue}`;
}
export function projectPeriod(entry: PortfolioContent["projects"][number]) {
  return [
    formatMonth(entry.startDate || ""),
    entry.endDate
      ? formatMonth(entry.endDate)
      : entry.startDate && entry.status === "In progress"
        ? "Present"
        : "",
  ]
    .filter(Boolean)
    .join(" - ");
}
export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""}`.toUpperCase();
}

export function friendlyValidation(error: z.ZodError) {
  return error.issues
    .slice(0, 4)
    .map((issue) => `${issue.path.join(" → ")}: ${issue.message}`)
    .join("\n");
}
