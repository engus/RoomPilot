import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false,
  // WebGL scenarios share the host graphics resources; parallel contexts stall on this development host.
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
  webServer: [
    { command: 'pnpm --filter @roompilot/server dev', url: 'http://127.0.0.1:3001/api/health', reuseExistingServer: !process.env.CI },
    { command: 'pnpm --filter @roompilot/web dev', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
  ],
});
