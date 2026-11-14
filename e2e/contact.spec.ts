import { expect, test, type Page } from "@playwright/test";
import { login, useDistinctClientIp } from "./support/helpers";

// Délai minimal de saisie humaine imposé par le serveur (MIN_FILL_TIME_MS = 3 s).
const HUMAN_DELAY_MS = 3_300;

const form = (page: Page) =>
  page.getByRole("form", { name: "Formulaire de contact" });

async function openForm(page: Page) {
  await page.goto("/#contact");
  await expect(form(page)).toBeVisible();
}

async function fillValid(page: Page, subject: string) {
  const contact = form(page);
  await contact.getByLabel("Prénom & Nom").fill("Visiteur E2E");
  await contact.getByLabel("Votre e-mail").fill("visiteur@exemple-e2e.fr");
  await contact.getByLabel(/^Sujet/).fill(subject);
  await contact
    .getByLabel("Votre message")
    .fill("Bonjour, ceci est un message envoyé par un test automatisé.");
}

const submit = (page: Page) =>
  form(page).getByRole("button", { name: "Envoyer" }).click();
const success = (page: Page) =>
  page.getByRole("status").filter({ hasText: "Message envoyé" });

test.describe("Formulaire de contact", () => {
  test("envoi trop rapide : refus explicite, saisie conservée", async ({
    page,
  }) => {
    await useDistinctClientIp(page);
    await openForm(page);
    await fillValid(page, "Trop rapide E2E");
    await submit(page);
    await expect(form(page).getByRole("alert")).toContainText("un peu vite");
    await expect(form(page).getByLabel("Votre message")).not.toHaveValue("");
  });

  test("validation des champs : erreurs reliées aux champs", async ({
    page,
  }) => {
    await useDistinctClientIp(page);
    await openForm(page);
    const contact = form(page);
    await contact.getByLabel("Prénom & Nom").fill("V");
    await contact.getByLabel("Votre e-mail").fill("pas-une-adresse");
    await contact.getByLabel("Votre message").fill("court");
    await page.waitForTimeout(HUMAN_DELAY_MS);
    await submit(page);

    await expect(contact.getByRole("alert")).toContainText("Veuillez corriger");
    const email = contact.getByLabel("Votre e-mail");
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAccessibleDescription("Adresse e-mail invalide.");
    await expect(contact.getByLabel("Prénom & Nom")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(contact.getByLabel("Votre message")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("honeypot rempli : faux succès", async ({ page }) => {
    await useDistinctClientIp(page);
    await openForm(page);
    await fillValid(page, "Honeypot E2E");
    await page
      .locator('input[name="website"]')
      .evaluate((input: HTMLInputElement) => {
        input.value = "https://spam.example";
      });
    await page.waitForTimeout(HUMAN_DELAY_MS);
    await submit(page);
    await expect(success(page)).toBeVisible();
  });

  test("message légitime : confirmation, double clic sans doublon", async ({
    page,
  }) => {
    await useDistinctClientIp(page);
    await openForm(page);
    await fillValid(page, "Légitime E2E");
    await page.waitForTimeout(HUMAN_DELAY_MS);
    await form(page).getByRole("button", { name: "Envoyer" }).dblclick();
    await expect(success(page)).toBeVisible();
    await expect(success(page)).toBeFocused();
  });

  test("limitation : 3 messages par adresse, puis refus", async ({ page }) => {
    test.setTimeout(60_000);
    await useDistinctClientIp(page);
    await openForm(page);
    for (let index = 1; index <= 3; index += 1) {
      await fillValid(page, `Limite E2E ${index}`);
      await page.waitForTimeout(HUMAN_DELAY_MS);
      await submit(page);
      await expect(success(page)).toBeVisible();
      await page
        .getByRole("button", { name: "Écrire un autre message" })
        .click();
    }
    await fillValid(page, "Limite E2E 4");
    await page.waitForTimeout(HUMAN_DELAY_MS);
    await submit(page);
    await expect(form(page).getByRole("alert")).toContainText(
      "Trop de messages",
    );
  });

  test("enregistrement vérifié dans l'administration", async ({ page }) => {
    await login(page);
    await page.goto("/admin/messages");
    // Un seul message malgré le double clic ; robots et envois refusés absents.
    await expect(page.getByRole("link", { name: /Légitime E2E/ })).toHaveCount(
      1,
    );
    await expect(page.getByRole("link", { name: /Honeypot E2E/ })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("link", { name: /Trop rapide E2E/ }),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Limite E2E 4/ })).toHaveCount(
      0,
    );
    await expect(page.getByRole("link", { name: /Limite E2E 3/ })).toHaveCount(
      1,
    );
  });
});
