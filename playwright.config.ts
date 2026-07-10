import { defineConfig } from "@playwright/test";

const isCI = Boolean((globalThis as { process?: { env?: { CI?: string } } }).process?.env?.CI);
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const host = env.KODU_HOST ?? "127.0.0.1";
const port = env.KODU_PORT ?? "5173";
const baseURL = env.KODU_BASE_URL ?? `http://${host}:${port}`;

export default defineConfig({
  testDir: "tests",
  timeout: 45_000,
  use: {
    baseURL,
    viewport: { width: 1280, height: 800 },
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --host ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 60_000,
  },
});
