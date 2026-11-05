import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);
const apiPort = Number(process.env.E2E_API_PORT ?? 4100);
const baseURL = `http://127.0.0.1:${port}`;
const apiURL = `http://127.0.0.1:${apiPort}`;
const isCI = Boolean(process.env.CI);

// Runs against the production build; run `pnpm build` first.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node dist/server.js",
      cwd: "../server",
      url: `${apiURL}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: "test",
        HOST: "127.0.0.1",
        PORT: String(apiPort),
        CORS_ORIGINS: baseURL,
        SESSION_SECRET: "e2e-session-secret-at-least-32-characters",
        COOKIE_SECURE: "false",
        LOG_LEVEL: "error",
        COUNTDOWN_DURATION_MS: "3000",
      },
    },
    {
      // Rewrites are stored in the build. This build is separate so e2e can
      // target the test API without changing the normal production build.
      command: `pnpm exec next build && pnpm exec next start --hostname 127.0.0.1 --port ${port}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_SERVER_URL: apiURL,
        NEXT_DIST_DIR: ".next-e2e",
      },
    },
  ],
});
