import { defineConfig, devices } from '@playwright/test';

const FRONTEND = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';
const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:4000';

export default defineConfig({
  testDir: './e2e',
  testMatch: /[^/]+\.spec\.ts$/,
  testIgnore: ['**/._*', '**/.DS_Store'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: '/tmp/mucjjippa-playwright-report' }]],
  outputDir: '/tmp/mucjjippa-test-results',
  use: {
    baseURL: FRONTEND,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run dev',
      cwd: './server',
      url: `${API}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev',
      url: FRONTEND,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
