import { defineConfig, devices } from "@playwright/test";

const e2eDatabasePath = `${process.cwd()}/prisma/integration-e2e-${Date.now()}.db`;
const e2eDatabaseUrl = `file:${e2eDatabasePath}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry"
  },
  webServer: {
    command:
      `DATABASE_URL=${e2eDatabaseUrl} npm run build && node -e "const fs=require('node:fs'); fs.closeSync(fs.openSync('${e2eDatabasePath}','a'))" && DATABASE_URL=${e2eDatabaseUrl} npx prisma migrate deploy && DATABASE_URL=${e2eDatabaseUrl} npm run db:seed && mkdir -p .next/standalone/.next/static .next/standalone/public && rsync -a .next/static/ .next/standalone/.next/static/ && rsync -a public/ .next/standalone/public/ && cd .next/standalone && DATABASE_URL=${e2eDatabaseUrl} HOSTNAME=127.0.0.1 PORT=3100 node server.js`,
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 }
      }
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 }
      }
    }
  ]
});
