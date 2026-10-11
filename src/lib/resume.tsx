import "server-only";
import { renderResumeBuffer } from "@/lib/resume-renderer";
import type { PortfolioContent } from "@/lib/portfolio";
export async function makeResume(content: PortfolioContent) {
  return renderResumeBuffer(content);
}
export function resumeFileName(content: PortfolioContent, draft = false) {
  const parts = content.profile.name.trim().split(/\s+/);
  const name =
    [parts[0], parts.length > 1 ? parts.at(-1) : ""]
      .filter(Boolean)
      .join("_")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 80) || "Portfolio";
  return `${name}_Resume_A4${draft ? "_Draft" : ""}.pdf`;
}
