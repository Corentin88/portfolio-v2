import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, E2E_PORT, e2eServerEnv } from "./e2e/support/e2e-env";

/**
 * Tests E2E sur un build de production (`npm run e2e` construit d'abord), servi
 * sur un port dédié avec la base `_e2e`, des médias et compteurs isolés dans
 * storage/e2e et Resend désactivé. Exécution en série : les tests partagent la
 * base et le cache du serveur, l'ordre doit rester déterministe.
 */
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    locale: "fr-FR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${E2E_PORT}`,
    // robots.txt ne lit pas la base : le serveur peut démarrer avant les données.
    url: `${BASE_URL}/robots.txt`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...(process.env as Record<string, string>), ...e2eServerEnv() },
  },
});
