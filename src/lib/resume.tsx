import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResumeDocument } from "@/components/resume-document";
import type { PortfolioContent } from "@/lib/portfolio";
export async function makeResume(content: PortfolioContent) { return renderToBuffer(<ResumeDocument content={content} />); }
export function resumeFileName(content: PortfolioContent, draft = false) {
  const parts = content.profile.name.trim().split(/\s+/);
  const name = [parts[0], parts.length > 1 ? parts.at(-1) : ""].filter(Boolean).join("_").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "Portfolio";
  return `${name}_Resume_A4${draft ? "_Draft" : ""}.pdf`;
}
