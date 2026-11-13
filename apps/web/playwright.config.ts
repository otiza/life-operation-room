import { defineConfig, devices } from '@playwright/test';

const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:3000';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Browser tests for the daily loop. They run against a real API + Postgres.
 * Locally, start Docker Postgres and point DATABASE_URL at it (not a shared Neon branch):
 *   DATABASE_URL=postgresql://tiza:tiza@localhost:5432/tiza pnpm --filter web test:e2e
 * Already-running dev servers on :3000 / :3001 are reused outside CI.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // next dev compiles each route on first hit; production builds in CI are fast.
  timeout: process.env.CI ? 30_000 : 120_000,
  expect: { timeout: process.env.CI ? 5_000 : 30_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter api start',
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: '../..',
    },
    {
      // CI runs `pnpm build` earlier. The port is explicit because CI exports PORT=3001 for the API,
      // and `next start` would otherwise read it and collide with the API.
      command: process.env.CI ? 'pnpm start --port 3000' : 'pnpm dev',
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
  ],
});
