// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import {
  CustomEditor,
  LayoutEditor,
  PhotoEditor,
} from "../src/components/studio-settings";
import { PortfolioView } from "../src/components/portfolio-view";
import { fixture } from "./fixtures";
import { sectionOrder, type PortfolioContent } from "../src/lib/portfolio";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function Editor() {
  const [content, setContent] = useState<PortfolioContent>(
    structuredClone(fixture),
  );
  return (
    <>
      <CustomEditor
        content={content}
        setContent={setContent}
        confirmDelete={(_, fn) => fn()}
      />
      <LayoutEditor
        content={content}
        setContent={setContent}
        channel="resume"
      />
      <output data-testid="content">{JSON.stringify(content)}</output>
    </>
  );
}
function current() {
  return JSON.parse(
    screen.getByTestId("content").textContent!,
  ) as PortfolioContent;
}
describe("custom section editor", () => {
  it("creates, edits, hides, reorders and deletes entries and sections with independent layout", async () => {
    const user = userEvent.setup();
    render(<Editor />);
    await user.click(screen.getByRole("button", { name: "Add section" }));
    await user.clear(screen.getByLabelText("Section title"));
    await user.type(screen.getByLabelText("Section title"), "Awards");
    await user.click(
      screen.getByRole("button", { name: "Add entry to Awards" }),
    );
    await user.type(screen.getByLabelText("Entry title"), "Engineering award");
    await user.click(
      screen.getByRole("button", { name: "Add entry to Awards" }),
    );
    await user.type(
      screen.getAllByLabelText("Entry title")[1],
      "Community award",
    );
    await user.click(
      screen.getByRole("button", { name: "Move Community award up" }),
    );
    expect(current().customSections![0].entries[0].title).toBe(
      "Community award",
    );
    await user.click(screen.getByLabelText("Show on website"));
    expect(current().customSections![0].showOnWebsite).toBe(false);
    expect(current().customSections![0].showOnResume).toBe(true);
    await user.click(
      screen.getByRole("button", { name: "Move Awards in resume up" }),
    );
    expect(
      sectionOrder(current(), "resume").indexOf(
        `custom:${current().customSections![0].id}`,
      ),
    ).toBe(5);
    expect(current().website).toBeUndefined();
    await user.click(
      screen.getByRole("button", { name: "Delete Engineering award" }),
    );
    expect(current().customSections![0].entries).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Delete section" }));
    expect(current().customSections).toHaveLength(0);
    expect(
      current().resume!.sectionOrder.some((id) => id.startsWith("custom:")),
    ).toBe(false);
  });
  it("shows genuine repository labels and resume-only custom entries stay off website", () => {
    const content = structuredClone(fixture);
    content.customSections = [
      {
        id: crypto.randomUUID(),
        title: "Awards",
        visible: true,
        showOnWebsite: false,
        showOnResume: true,
        entries: [
          {
            id: crypto.randomUUID(),
            visible: true,
            title: "Private placement",
            organization: "",
            date: "",
            description: "",
            bullets: [],
            url: "",
          },
        ],
      },
    ];
    render(<PortfolioView content={content} />);
    expect(screen.queryByText("Private placement")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      fixture.profile.name,
    );
    expect(
      screen.getAllByRole("link", { name: /Download resume/ }).length,
    ).toBe(1);
  });
});

it.each([false, true])(
  "keeps one resume action and one contact destination (preview: %s)",
  async (preview) => {
    const user = userEvent.setup();
    render(<PortfolioView content={fixture} preview={preview} />);
    const resume = screen.getByRole("link", { name: "Download resume" });
    expect(resume.getAttribute("href")).toBe(
      preview ? "/admin/resume" : "/api/resume",
    );
    expect(
      document.querySelectorAll(`a[href="${resume.getAttribute("href")}"]`),
    ).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Contact me" })).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "Contact me" }).getAttribute("href"),
    ).toBe("#contact");
    expect(
      screen.queryByRole("navigation", { name: "Portfolio sections" }),
    ).toBeNull();
    await user.click(document.querySelector(".recruiter-menu summary")!);
    expect(
      screen.getByRole("link", { name: "Contact" }).getAttribute("href"),
    ).toBe("#contact");
    expect(document.querySelectorAll("#contact")).toHaveLength(1);
  },
);

it("shows supplied education, project, certification and language details without score placeholders", () => {
  const content = structuredClone(fixture);
  Object.assign(content.education[0], {
    resultType: "Percentage",
    resultValue: "85",
    board: "Example University",
    highlights: ["Academic distinction"],
  });
  Object.assign(content.projects[0], {
    startDate: "2026-01",
    endDate: "2026-06",
  });
  content.certifications[0].credentialId = "SQL-123";
  content.languages[0].proficiency = "Fluent";
  render(<PortfolioView content={content} />);
  for (const value of [
    /Percentage: 85%/,
    /Example University/,
    /Academic distinction/,
    /Jan 2026 - Jun 2026/,
    /Credential ID: SQL-123/,
    /English: Fluent/,
  ])
    expect(screen.getByText(value)).toBeTruthy();
  expect(screen.queryByText(/CGPA:/)).toBeNull();
});

it("replaces and removes a portrait in draft while reset restores the saved preview", async () => {
  const oldPath = `${crypto.randomUUID()}/${crypto.randomUUID()}.webp`,
    newPath = `${crypto.randomUUID()}/${crypto.randomUUID()}.webp`;
  const upload = vi.fn().mockResolvedValue(Response.json({ path: newPath }));
  vi.stubGlobal("fetch", upload);
  const RealURL = URL;
  vi.stubGlobal(
    "URL",
    class extends RealURL {
      static createObjectURL() {
        return "blob:uploaded-portrait";
      }
      static revokeObjectURL() {}
    },
  );
  function PhotoHost() {
    const original = {
      ...structuredClone(fixture),
      profile: { ...fixture.profile, photoPath: oldPath },
    };
    const [content, setContent] = useState<PortfolioContent>(original);
    return (
      <>
        <PhotoEditor content={content} setContent={setContent} />
        <button onClick={() => setContent(original)}>Reset test draft</button>
        <output data-testid="photo-path">
          {content.profile.photoPath || "none"}
        </output>
      </>
    );
  }
  const user = userEvent.setup();
  render(<PhotoHost />);
  await user.upload(
    screen.getByLabelText("Upload or replace portrait"),
    new File(["image"], "portrait.jpg", { type: "image/jpeg" }),
  );
  await screen.findByText(
    "Photo uploaded. Save your draft, preview, then publish.",
  );
  expect(screen.getByTestId("photo-path").textContent).toBe(newPath);
  expect(screen.getByAltText("Draft portrait").getAttribute("src")).toBe(
    "blob:uploaded-portrait",
  );
  await user.click(screen.getByRole("button", { name: "Reset test draft" }));
  expect(screen.getByAltText("Draft portrait").getAttribute("src")).toContain(
    encodeURIComponent(oldPath),
  );
  await user.click(
    screen.getByRole("button", { name: "Remove portrait from draft" }),
  );
  expect(screen.getByTestId("photo-path").textContent).toBe("none");
  expect(screen.queryByAltText("Draft portrait")).toBeNull();
  expect(upload).toHaveBeenCalledTimes(1);
});
