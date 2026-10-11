import { defineConfig } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const remoteOrigin = process.env.E2E_BASE_URL
  ? new URL(process.env.E2E_BASE_URL).origin
  : undefined;
const baseURL = remoteOrigin ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  workers: 1,
  use: { baseURL },
  // These HTTP tests use no owner password and never write portfolio data.
  webServer: remoteOrigin
    ? undefined
    : {
        command: "npm run dev",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
