import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? 3200)
const database = join(mkdtempSync(join(tmpdir(), 'folio-e2e-')), 'folio.db')

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    locale: 'ru-RU',
    trace: 'off',
    launchOptions: process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {},
  },
  webServer: {
    command: 'node server/main.ts',
    url: `http://localhost:${port}/api/capabilities`,
    env: { PORT: String(port), DATABASE_PATH: database, WEB_ROOT: 'web/dist', RATE_LIMITS: 'off' },
    reuseExistingServer: false,
    timeout: 60000,
  },
})
