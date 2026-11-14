import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";
import { ADMIN, E2E_STORAGE } from "./e2e-env";

export type Fixtures = { publicShot: string; draftShot: string };

export function readFixtures(): Fixtures {
  return JSON.parse(
    readFileSync(path.join(E2E_STORAGE, "fixtures.json"), "utf8"),
  ) as Fixtures;
}

let ipCounter = 0;
/**
 * Adresse cliente distincte par test (X-Forwarded-For) : les limitations par IP
 * (connexion, contact) d'un test n'influencent jamais un autre.
 */
export async function useDistinctClientIp(page: Page): Promise<string> {
  ipCounter += 1;
  const ip = `198.51.100.${(Date.now() + ipCounter) % 250}`;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
  return ip;
}

export async function login(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Mot de passe").fill(ADMIN.password);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: `Bonjour ${ADMIN.name}` }),
  ).toBeVisible();
}

/**
 * Choisit un média par le sélecteur universel d'un champ (recherche puis clic),
 * sans enregistrer : le formulaire parent reste à valider.
 */
export async function pickMedia(
  page: Page,
  scope: Locator,
  fieldLabel: string,
  search: string,
  itemName: string | RegExp,
): Promise<void> {
  const field = scope.getByRole("group", { name: fieldLabel, exact: true });
  await field
    .getByRole("button", { name: /Choisir un média|Remplacer/ })
    .click();
  const dialog = page.getByRole("dialog", { name: fieldLabel });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("searchbox").fill(search);
  await dialog.getByRole("button", { name: itemName }).click();
  await dialog.getByRole("button", { name: "Valider ce média" }).click();
  await expect(dialog).toBeHidden();
}

/** Retire le média d'un champ du sélecteur (sans enregistrer). */
export async function clearMedia(scope: Locator, fieldLabel: string) {
  await scope
    .getByRole("group", { name: fieldLabel, exact: true })
    .getByRole("button", { name: "Retirer" })
    .click();
}
