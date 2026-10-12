// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Studio } from "../src/components/studio";
import { fixture } from "./fixtures";

const actions = vi.hoisted(() => ({
  saveDraftAction: vi.fn(),
  publishAction: vi.fn(),
  signOutAction: vi.fn(),
}));
vi.mock("@/app/admin/actions", () => actions);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ pageCount: 2, revision: 1 })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function studio() {
  render(
    <Studio
      initialDraft={{
        content: structuredClone(fixture),
        revision: 1,
        updated_at: "2026-10-12T00:00:00Z",
      }}
      initialPublished={null}
    />,
  );
}

it.each(["connection", "provider"])(
  "recovers editor controls after a %s sign-out failure",
  async (failure) => {
    if (failure === "connection")
      actions.signOutAction.mockRejectedValue(new Error("offline"));
    else
      actions.signOutAction.mockResolvedValue({
        error: "Sign-out failed. Please retry before leaving this device.",
      });
    const user = userEvent.setup();
    studio();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Sign-out/);
    expect(
      (screen.getByRole("button", { name: "Sign out" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(
      (screen.getByLabelText("Full name") as HTMLInputElement).disabled,
    ).toBe(false);
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(actions.signOutAction).toHaveBeenCalledTimes(2);
  },
);

it("waits for a portrait upload before saving and keeps the returned portrait in the saved draft", async () => {
  let finishUpload!: (response: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    finishUpload = resolve;
  });
  const path = `${crypto.randomUUID()}/${crypto.randomUUID()}.webp`;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      url === "/admin/profile-photo"
        ? pending
        : Promise.resolve(Response.json({ pageCount: 2, revision: 1 })),
    ),
  );
  const RealURL = URL;
  vi.stubGlobal(
    "URL",
    class extends RealURL {
      static createObjectURL() {
        return "blob:portrait";
      }
      static revokeObjectURL() {}
    },
  );
  actions.saveDraftAction.mockImplementation(async (content) => ({
    ok: true,
    data: { content, revision: 2, updatedAt: "2026-10-12T00:01:00Z" },
  }));
  const user = userEvent.setup();
  studio();
  await user.type(screen.getByLabelText("Full name"), " Updated");
  await user.upload(
    screen.getByLabelText("Upload or replace portrait"),
    new File(["image"], "portrait.jpg", { type: "image/jpeg" }),
  );
  await screen.findByText("Uploading…");
  for (const name of [
    "Save draft",
    "Sign out",
    "Projects1",
    "Preview",
    "Reset changes",
  ])
    expect(
      (screen.getByRole("button", { name }) as HTMLButtonElement).disabled,
    ).toBe(true);
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  expect(actions.saveDraftAction).not.toHaveBeenCalled();
  await act(async () => finishUpload(Response.json({ path })));
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "Save draft" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText(
    "Draft saved. Preview it, then publish when you’re ready.",
  );
  expect(actions.saveDraftAction.mock.calls[0][0].profile.photoPath).toBe(path);
  expect(screen.getByAltText("Draft portrait").getAttribute("src")).toBe(
    "blob:portrait",
  );
});

it("unlocks the editor after a portrait upload fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      url === "/admin/profile-photo"
        ? Promise.reject(new Error("Upload connection lost"))
        : Promise.resolve(Response.json({ pageCount: 2, revision: 1 })),
    ),
  );
  const user = userEvent.setup();
  studio();
  await user.upload(
    screen.getByLabelText("Upload or replace portrait"),
    new File(["image"], "portrait.jpg", { type: "image/jpeg" }),
  );
  await screen.findByText("Upload connection lost");
  expect(
    (screen.getByRole("button", { name: "Sign out" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
});
