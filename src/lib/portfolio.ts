import { z } from "zod";

const text = (limit = 200) => z.string().trim().max(limit);
const required = (limit = 200) => text(limit).min(1, "This field is required.");
const link = text(1000).refine((value) => {
  if (!value) return true;
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}, "Enter a complete http:// or https:// URL.");
const month = text(7).refine((value) => !value || /^\d{4}-(0[1-9]|1[0-2])$/.test(value), "Use YYYY-MM.");
const year = text(4).refine((value) => !value || /^(19|20)\d{2}$/.test(value), "Use a four-digit year.");
const item = { id: z.string().uuid(), visible: z.boolean() };
const bullets = z.array(required(1200)).max(30);

export const portfolioSchema = z.object({
  schemaVersion: z.literal(1),
  profile: z.object({
    name: required(100), title: required(120), summary: required(2000),
    email: z.string().trim().email().max(200), phone: text(40), location: text(100),
    availability: text(100), github: link, linkedin: link,
  }),
  skillGroups: z.array(z.object({ ...item, name: required(100), skills: z.array(required(100)).max(60) })).max(30),
  experiences: z.array(z.object({
    ...item, company: required(150), role: required(150), location: text(100),
    startDate: month, endDate: month, current: z.boolean(), bullets,
  }).refine((entry) => !entry.current || !entry.endDate, { message: "An ongoing role cannot have an end date.", path: ["endDate"] })
    .refine((entry) => !entry.startDate || !entry.endDate || entry.endDate >= entry.startDate, { message: "End date must be after start date.", path: ["endDate"] })).max(100),
  projects: z.array(z.object({
    ...item, name: required(150), summary: required(3000), technologies: z.array(required(80)).max(40),
    bullets, demoUrl: link, githubUrl: link, featured: z.boolean(),
    status: z.enum(["", "In progress", "Completed"]),
  })).max(100),
  education: z.array(z.object({
    ...item, qualification: required(180), institution: required(180), startYear: year, endYear: year,
  }).refine((entry) => !entry.startYear || !entry.endYear || entry.endYear >= entry.startYear, { message: "End year must be after start year.", path: ["endYear"] })).max(50),
  certifications: z.array(z.object({ ...item, name: required(200), issuer: text(150), year, url: link })).max(100),
  languages: z.array(z.object({ ...item, name: required(80) })).max(30),
});

export type PortfolioContent = z.infer<typeof portfolioSchema>;
export type CollectionKey = Exclude<keyof PortfolioContent, "profile" | "schemaVersion">;
export type PortfolioSnapshot = { content: PortfolioContent; source_revision: number; published_at: string };
export type PortfolioDraft = { content: PortfolioContent; revision: number; updated_at: string };

export const collectionLabels: Record<CollectionKey, string> = {
  projects: "Projects", experiences: "Experience", skillGroups: "Skills", education: "Education",
  certifications: "Certifications", languages: "Languages",
};

export function newEntry(key: CollectionKey) {
  const base = { id: crypto.randomUUID(), visible: true };
  switch (key) {
    case "projects": return { ...base, name: "New project", summary: "Describe the problem, your contribution, and the outcome.", technologies: [], bullets: [], demoUrl: "", githubUrl: "", featured: false, status: "In progress" as const };
    case "experiences": return { ...base, company: "New company", role: "New role", location: "", startDate: "", endDate: "", current: false, bullets: [] };
    case "skillGroups": return { ...base, name: "New category", skills: [] };
    case "education": return { ...base, qualification: "New qualification", institution: "Institution", startYear: "", endYear: "" };
    case "certifications": return { ...base, name: "New certification", issuer: "", year: "", url: "" };
    case "languages": return { ...base, name: "New language" };
  }
}

export function publicContent(content: PortfolioContent): PortfolioContent {
  return { ...content, ...Object.fromEntries(Object.keys(collectionLabels).map((key) => [key, content[key as CollectionKey].filter((entry) => entry.visible)])) };
}

export function formatMonth(value: string): string {
  if (!value) return "";
  return new Date(`${value}-01T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}
export function experiencePeriod(entry: PortfolioContent["experiences"][number]) {
  return [formatMonth(entry.startDate), entry.current ? "Present" : formatMonth(entry.endDate)].filter(Boolean).join(" - ");
}
export function educationPeriod(entry: PortfolioContent["education"][number]) {
  return [entry.startYear, entry.endYear].filter(Boolean).join(" - ");
}
export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`.toUpperCase();
}

export function friendlyValidation(error: z.ZodError) {
  return error.issues.slice(0, 4).map((issue) => `${issue.path.join(" → ")}: ${issue.message}`).join("\n");
}
