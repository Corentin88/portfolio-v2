import { expect, test, type Page } from "@playwright/test";

const projectCard = (page: Page, title: string) =>
  page.getByRole("link", { name: `Découvrir le projet ${title}` });
const projectDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Atlas Démo" });

test.describe("Accueil", () => {
  test("se charge avec les contenus et le titre SEO", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Portfolio E2E — Développeur fictif");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(projectCard(page, "Atlas Démo")).toBeVisible();
    await expect(projectCard(page, "Borealis Démo")).toBeVisible();
    // Brouillon jamais listé.
    await expect(page.getByText("Projet brouillon")).toHaveCount(0);
  });

  test("affiche la carte de visite avec les initiales sans photo", async ({
    page,
  }) => {
    await page.goto("/#presentation");
    const card = page.locator("#presentation");
    await expect(card.getByText("Corentin Lanaud")).toBeVisible();
    // Initiales et décor d'éditeur : visibles mais masqués aux lecteurs d'écran.
    // Copie masquée transitoire du streaming React exclue : une seule visible.
    await expect(
      card.getByText("CL", { exact: true }).filter({ visible: true }),
    ).toHaveCount(1);
    await expect(card.getByText("corentin.lanaud.tsx")).toBeVisible();
    await expect(card.getByRole("img")).toHaveCount(0);
  });

  test("navigue entre les sections depuis le menu", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    for (const [label, id] of [
      ["Compétences", "competences"],
      ["Projets", "projets"],
      ["Parcours", "parcours"],
      ["Présentation", "presentation"],
    ] as const) {
      await nav.getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
  });

  test("bascule et mémorise le thème clair/sombre", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Passer en thème clair" }).click();
    await expect(html).not.toHaveClass(/dark/);
    await page.reload();
    await expect(html).not.toHaveClass(/dark/);
    await page.getByRole("button", { name: "Passer en thème sombre" }).click();
    await expect(html).toHaveClass(/dark/);
  });
});

test.describe("Responsive", () => {
  for (const [name, viewport] of [
    ["mobile", { width: 375, height: 740 }],
    ["tablette", { width: 820, height: 1180 }],
    ["ordinateur", { width: 1440, height: 900 }],
  ] as const) {
    test(`aucun défilement horizontal (${name})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      for (const path of ["/", "/projets/atlas-demo"]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(
          overflow,
          `${path} déborde de ${overflow}px`,
        ).toBeLessThanOrEqual(0);
      }
    });
  }

  test("menu mobile : ouverture, navigation, fermeture", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Ouvrir le menu" });
    await toggle.click();
    await expect(
      page.getByRole("button", { name: "Fermer le menu" }),
    ).toHaveAttribute("aria-expanded", "true");
    await page
      .getByRole("navigation", { name: "Menu mobile" })
      .getByRole("link", { name: "Projets" })
      .click();
    await expect(page).toHaveURL(/#projets$/);
    await expect(
      page.getByRole("button", { name: "Ouvrir le menu" }),
    ).toBeVisible();
  });
});

test.describe("Fiche projet", () => {
  test("s'ouvre et se ferme plusieurs fois en modale", async ({ page }) => {
    await page.goto("/#projets");
    for (let round = 0; round < 3; round += 1) {
      await projectCard(page, "Atlas Démo").click();
      await expect(page).toHaveURL(/\/projets\/atlas-demo/);
      await expect(projectDialog(page)).toBeVisible();
      // Modale réelle : le fond est inerte.
      expect(
        await projectDialog(page).evaluate((dialog) =>
          dialog.matches(":modal"),
        ),
      ).toBe(true);
      if (round % 2 === 0) await page.keyboard.press("Escape");
      else
        await page
          .getByRole("button", { name: "Fermer la fiche projet" })
          .click();
      await expect(projectDialog(page)).toBeHidden();
      await expect(page).toHaveURL(/\/(#projets)?$/);
    }
    // Défilement de la page rétabli après fermeture.
    expect(
      await page.evaluate(() => document.documentElement.style.overflow),
    ).toBe("");
  });

  test("suit les boutons précédent/suivant du navigateur", async ({ page }) => {
    await page.goto("/");
    await projectCard(page, "Atlas Démo").click();
    await expect(projectDialog(page)).toBeVisible();
    await page.goBack();
    await expect(projectDialog(page)).toBeHidden();
    await page.goForward();
    await expect(projectDialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(projectDialog(page)).toBeHidden();
  });

  test("versions, galerie et agrandissement", async ({ page }) => {
    await page.goto("/");
    await projectCard(page, "Atlas Démo").click();
    const dialog = projectDialog(page);
    const versions = dialog.getByRole("group", { name: "Versions du projet" });

    // Version la plus récente par défaut.
    await expect(
      versions.getByRole("button", { name: "Version 2" }),
    ).toHaveAttribute("aria-pressed", "true");
    await versions.getByRole("button", { name: "Version 1" }).click();
    await expect(page).toHaveURL(/version=v1/);
    await expect(
      dialog.getByText("Description fictive de la version 1."),
    ).toBeVisible();

    const thumbnails = dialog.getByRole("group", {
      name: "Miniatures des captures — Version 1",
    });
    const shot = (n: number) =>
      thumbnails.getByRole("button", { name: `Afficher la capture ${n}` });
    await expect(shot(1)).toHaveAttribute("aria-current", "true");
    await dialog.getByRole("button", { name: "Capture suivante" }).click();
    await expect(shot(2)).toHaveAttribute("aria-current", "true");
    await dialog.getByRole("button", { name: "Capture précédente" }).click();
    await expect(shot(1)).toHaveAttribute("aria-current", "true");

    // Image servie réellement (média public).
    const image = dialog
      .getByRole("img", { name: "Capture fictive : Atlas 1" })
      .first();
    await expect(image).toBeVisible();
    expect(
      await image.evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0);

    await dialog.getByRole("button", { name: "Agrandir la capture" }).click();
    const lightbox = page.getByRole("dialog", { name: /Capture agrandie/ });
    await expect(lightbox).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(lightbox).toBeHidden();
    // Échap ferme seulement l'agrandissement, pas la fiche.
    await expect(dialog).toBeVisible();
  });

  test("page complète et retour vers /#projets", async ({ page }) => {
    await page.goto("/projets/atlas-demo?version=v1");
    await expect(
      page.getByRole("heading", { level: 1, name: "Atlas Démo" }),
    ).toBeVisible();
    await expect(
      page.getByText("Description fictive de la version 1."),
    ).toBeVisible();
    await page.getByRole("link", { name: "Tous les projets" }).click();
    await expect(page).toHaveURL(/\/#projets$/);
    await expect(page.locator("#projets")).toBeInViewport();
  });
});

test.describe("CV", () => {
  test("consultation et téléchargement", async ({ page, request }) => {
    const inline = await request.get("/cv");
    expect(inline.status()).toBe(200);
    expect(inline.headers()["content-type"]).toBe("application/pdf");
    expect(inline.headers()["content-disposition"]).toMatch(/^inline;/);

    await page.goto("/");
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: /Télécharger mon CV/ }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
