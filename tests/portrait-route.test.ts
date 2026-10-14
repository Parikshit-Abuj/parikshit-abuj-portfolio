import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "../src/app/admin/profile-photo/route";

const data = vi.hoisted(() => ({
  ownerClient: vi.fn(),
  getDraft: vi.fn(),
  download: vi.fn(),
  getClaims: vi.fn(),
}));
vi.mock("@/lib/data", () => data);
const owner = "11111111-1111-4111-8111-111111111111";
const savedPath = `${owner}/22222222-2222-4222-8222-222222222222.webp`;
const uploadedPath = `${owner}/33333333-3333-4333-8333-333333333333.webp`;

beforeEach(() => {
  vi.resetAllMocks();
  data.ownerClient.mockResolvedValue({
    auth: { getClaims: data.getClaims },
    storage: { from: () => ({ download: data.download }) },
  });
  data.getClaims.mockResolvedValue({ data: { claims: { sub: owner } } });
  data.getDraft.mockResolvedValue({
    content: { profile: { photoPath: savedPath } },
  });
  data.download.mockResolvedValue({
    data: new Blob(["portrait"]),
    error: null,
  });
});

it("loads the newly uploaded portrait when returning to the profile before saving", async () => {
  const response = await GET(
    new Request(
      `https://portfolio.example/admin/profile-photo?v=${uploadedPath}`,
    ),
  );
  expect(response.status).toBe(200);
  expect(data.download).toHaveBeenCalledWith(uploadedPath);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

it("uses the saved portrait when no path is requested", async () => {
  const response = await GET(
    new Request("https://portfolio.example/admin/profile-photo"),
  );
  expect(response.status).toBe(200);
  expect(data.download).toHaveBeenCalledWith(savedPath);
});

it.each([
  "44444444-4444-4444-8444-444444444444/33333333-3333-4333-8333-333333333333.webp",
  `${owner}/../private.webp`,
  "",
])("rejects an invalid or foreign portrait path: %s", async (path) => {
  const response = await GET(
    new Request(
      `https://portfolio.example/admin/profile-photo?v=${encodeURIComponent(path)}`,
    ),
  );
  expect(response.status).toBe(403);
  expect(data.download).not.toHaveBeenCalled();
});

it("does not serve uploaded portraits without owner authentication", async () => {
  data.ownerClient.mockRejectedValue(new Error("Please sign in again."));
  const response = await GET(
    new Request(
      `https://portfolio.example/admin/profile-photo?v=${uploadedPath}`,
    ),
  );
  expect(response.status).toBe(403);
  expect(data.download).not.toHaveBeenCalled();
});

it("does not serve a portrait after the authentication session expires", async () => {
  data.getClaims.mockResolvedValue({ data: null, error: new Error("Expired") });
  const response = await GET(
    new Request(
      `https://portfolio.example/admin/profile-photo?v=${uploadedPath}`,
    ),
  );
  expect(response.status).toBe(403);
  expect(data.download).not.toHaveBeenCalled();
});

it("returns no portrait after removal from the saved draft", async () => {
  data.getDraft.mockResolvedValue({ content: { profile: {} } });
  const response = await GET(
    new Request("https://portfolio.example/admin/profile-photo"),
  );
  expect(response.status).toBe(404);
  expect(data.download).not.toHaveBeenCalled();
});
