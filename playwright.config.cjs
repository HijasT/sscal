const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.cjs',
  timeout: 60000,
  expect: { timeout: 20000 },
  retries: 1,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    acceptDownloads: true,
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run start -- -p 3100',
    url: 'http://127.0.0.1:3100',
    timeout: 90000,
    reuseExistingServer: false,
  },
})
