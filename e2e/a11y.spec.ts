import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/helpers";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * Audit axe (WCAG 2.2 A/AA automatisables). Ne prouve pas la conformité RGAA :
 * environ un tiers des critères seulement est vérifiable automatiquement.
 */
async function expectNoViolations(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();
  const summary = violations.flatMap((v) =>
    v.nodes.map(
      (node) =>
        `${v.impact} · ${v.id} · ${node.target.join(" ")} · ${node.any[0]?.message ?? node.failureSummary ?? ""}`,
    ),
  );
  expect(summary, `${label}\n${summary.join("\n")}`).toEqual([]);
}

test.describe("Accessibilité (axe)", () => {
  for (const theme of ["dark", "light"] as const) {
    test(`accueil et fiche projet — thème ${theme}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript((value) => {
        localStorage.setItem("theme", value);
      }, theme);

      await page.goto("/");
      await expect(page.locator("html")).toHaveClass(
        theme === "dark" ? /dark/ : /^(?!.*dark)/,
      );
      await expectNoViolations(page, `accueil (${theme})`);

      await page
        .getByRole("link", { name: "Découvrir le projet Atlas Démo" })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Atlas Démo" }),
      ).toBeVisible();
      await expectNoViolations(page, `modale projet (${theme})`);

      await page.goto("/projets/atlas-demo");
      await expectNoViolations(page, `page projet (${theme})`);
    });
  }

  test("pages 404, connexion et administration", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/page-inexistante");
    await expectNoViolations(page, "404");
    await page.goto("/admin/login");
    await expectNoViolations(page, "connexion");
    await login(page);
    await expectNoViolations(page, "tableau de bord");
    for (const path of ["/admin/projets", "/admin/messages", "/admin/medias"]) {
      await page.goto(path);
      await expect(page.getByRole("main")).toBeVisible();
      await expectNoViolations(page, path);
    }
  });
});

test.describe("Clavier et mouvement", () => {
  test("lien d'évitement en premier arrêt de tabulation", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Aller au contenu" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
  });

  test("la modale piège le focus et le rend à l'ouverture", async ({
    page,
  }) => {
    await page.goto("/");
    const card = page.getByRole("link", {
      name: "Découvrir le projet Atlas Démo",
    });
    await card.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Atlas Démo" });
    await expect(dialog).toBeVisible();
    for (let index = 0; index < 25; index += 1) {
      await page.keyboard.press("Tab");
      // Après le dernier élément, le dialogue natif rend le focus à l'interface du
      // navigateur (activeElement = body) : seul un élément de la page dessous est une fuite.
      const inside = await dialog.evaluate(
        (node) =>
          node.contains(document.activeElement) ||
          document.activeElement === document.body,
      );
      expect(inside, `focus sorti de la modale après ${index + 1} Tab`).toBe(
        true,
      );
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("prefers-reduced-motion : contenus visibles sans animation", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const hidden = await page.$$eval(
      ".reveal",
      (nodes) =>
        nodes.filter((node) => getComputedStyle(node).opacity !== "1").length,
    );
    expect(hidden).toBe(0);
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
    ).toBe("auto");
  });
});
