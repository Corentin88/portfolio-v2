import { expect, test, type Page } from "@playwright/test";
import { ADMIN, BASE_URL } from "./support/e2e-env";
import {
  clearMedia,
  login,
  pickMedia,
  useDistinctClientIp,
} from "./support/helpers";

const region = (page: Page, name: string | RegExp) =>
  page.getByRole("region", { name });

test.describe("Accès à l'administration", () => {
  test("redirige un visiteur non connecté vers la connexion", async ({
    page,
  }) => {
    for (const path of ["/admin", "/admin/projets", "/admin/messages"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/admin\/login$/);
    }
  });

  test("refuse un cookie de session forgé", async ({ page, context }) => {
    await context.addCookies([
      { name: "authjs.session-token", value: "forge", url: BASE_URL },
    ]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByText(`Bonjour ${ADMIN.name}`)).toHaveCount(0);
  });

  test("identifiants incorrects : message générique", async ({ page }) => {
    await useDistinctClientIp(page);
    await page.goto("/admin/login");
    await page.getByLabel("E-mail").fill(ADMIN.email);
    await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Identifiants incorrects.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("connexion, tableau de bord et déconnexion", async ({ page }) => {
    await login(page);
    await expect(region(page, "Messages")).toBeVisible();
    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("session révoquée : l'ancien cookie ne donne plus accès", async ({
    page,
    browser,
  }) => {
    await login(page);
    const stolen = await page.context().cookies();
    await page
      .getByRole("button", { name: "Déconnecter toutes les sessions" })
      .click();
    await expect(page).toHaveURL(/\/admin\/login$/);

    const other = await browser.newContext({ baseURL: BASE_URL });
    await other.addCookies(stolen);
    const otherPage = await other.newPage();
    await otherPage.goto("/admin");
    await expect(otherPage).toHaveURL(/\/admin\/login$/);
    await other.close();
  });

  test("session expirée (cookie disparu) : retour à la connexion", async ({
    page,
  }) => {
    await login(page);
    await page.context().clearCookies();
    await page.goto("/admin/projets");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe("Projets et versions", () => {
  test("création, publication, modification, dépublication et suppressions", async ({
    page,
    request,
  }) => {
    await login(page);
    await page.goto("/admin/projets");

    // Création (toujours en brouillon).
    const creation = region(page, "Nouveau projet");
    await creation.getByLabel("Titre", { exact: true }).fill("Projet E2E");
    await creation.getByLabel(/^Slug/).fill("projet-e2e");
    await creation.getByLabel(/^Résumé/).fill("Résumé du projet créé par E2E.");
    await creation.getByLabel("Catégorie").selectOption({ label: "Web" });
    await creation.getByRole("button", { name: "Créer le projet" }).click();
    await expect(page).toHaveURL(/\/admin\/projets\/[a-z0-9]+$/);
    expect((await request.get("/projets/projet-e2e")).status()).toBe(404);

    // Version.
    const versions = region(page, /^Versions/);
    await versions
      .getByLabel("Description", { exact: true })
      .fill("Version créée par le test E2E.");
    await versions.getByRole("button", { name: "Ajouter la version" }).click();
    await expect(versions.getByRole("status")).toContainText(
      "créée en brouillon",
    );

    // Règle métier : pas de projet publié sans version publiée.
    const info = region(page, "Informations et publication");
    await info.getByLabel("Statut du projet").selectOption("PUBLISHED");
    await info.getByRole("button", { name: "Enregistrer le projet" }).click();
    await expect(info.getByRole("alert")).toBeVisible();

    // Publication de la version, puis du projet.
    await versions.getByText("Contenu, statut, liens et technologies").click();
    await versions
      .getByLabel("Statut", { exact: true })
      .selectOption("PUBLISHED");
    await versions
      .getByRole("button", { name: "Enregistrer la version" })
      .click();
    await expect(versions.getByRole("status").first()).toContainText(
      "Version enregistrée",
    );
    await info.getByLabel("Statut du projet").selectOption("PUBLISHED");
    await info.getByRole("button", { name: "Enregistrer le projet" }).click();
    await expect(info.getByRole("status")).toContainText("Projet enregistré");

    // Visible publiquement (cache invalidé).
    const publicPage = await page.context().newPage();
    await publicPage.goto("/projets/projet-e2e");
    await expect(
      publicPage.getByRole("heading", { level: 1, name: "Projet E2E" }),
    ).toBeVisible();
    await publicPage.goto("/");
    await expect(
      publicPage.getByRole("link", { name: "Découvrir le projet Projet E2E" }),
    ).toBeVisible();

    // Modification visible publiquement.
    await info.getByLabel("Titre", { exact: true }).fill("Projet E2E modifié");
    await info.getByRole("button", { name: "Enregistrer le projet" }).click();
    await expect(
      page.getByRole("heading", { name: /Projet E2E modifié/ }).first(),
    ).toBeVisible();
    // Régression : la réinitialisation du formulaire ne doit pas rétablir l'ancien statut.
    await expect(info.getByLabel("Statut du projet")).toHaveValue("PUBLISHED");
    await publicPage.goto("/projets/projet-e2e");
    await expect(
      publicPage.getByRole("heading", { level: 1, name: "Projet E2E modifié" }),
    ).toBeVisible();

    // Dépublication : la fiche disparaît (vrai 404).
    await info.getByLabel("Statut du projet").selectOption("DRAFT");
    await info.getByRole("button", { name: "Enregistrer le projet" }).click();
    await expect(info.getByRole("status")).toContainText("Projet enregistré");
    // La confirmation précédente reste affichée : on attend l'effet réel.
    await expect
      .poll(async () => (await request.get("/projets/projet-e2e")).status())
      .toBe(404);
    await publicPage.close();

    // Suppression de la version : annuler, Échap, puis confirmer.
    const deleteVersion = versions.getByRole("button", {
      name: "Supprimer « V1 »",
    });
    const confirmDialog = page.getByRole("alertdialog");
    await deleteVersion.click();
    await expect(confirmDialog).toBeVisible();
    await expect(
      confirmDialog.getByRole("button", { name: "Annuler" }),
    ).toBeFocused();
    await confirmDialog.getByRole("button", { name: "Annuler" }).click();
    await expect(confirmDialog).toBeHidden();
    await expect(deleteVersion).toBeFocused();
    await deleteVersion.click();
    await page.keyboard.press("Escape");
    await expect(confirmDialog).toBeHidden();
    await expect(deleteVersion).toBeVisible();
    await deleteVersion.click();
    await confirmDialog
      .getByRole("button", { name: "Supprimer définitivement" })
      .click();
    await expect(region(page, "Versions (0)")).toBeVisible();

    // Suppression du projet.
    await page.getByRole("button", { name: "Supprimer le projet" }).click();
    await confirmDialog
      .getByRole("button", { name: "Supprimer définitivement" })
      .click();
    await expect(page).toHaveURL(/\/admin\/projets$/);
    // Rôles : ignorent la page précédente que Next garde masquée (<Activity>).
    await expect(
      page.getByRole("link", { name: /Projet E2E modifié/ }),
    ).toHaveCount(0);
  });
});

test.describe("Personnalisation depuis la médiathèque", () => {
  const item = (n: number) => new RegExp(`^Atlas ${n}\\.png — Capture fictive`);

  test("photo de profil, illustration de timeline, logo et couleur de badge", async ({
    page,
  }) => {
    await login(page);
    const publicPage = await page.context().newPage();
    const card = publicPage.locator("#presentation");
    // Seules les copies visibles comptent : pendant le streaming, React garde un
    // court instant une copie masquée (attribut hidden) du contenu à révéler.
    const initials = card.getByText("CL", { exact: true }).filter({
      visible: true,
    });
    const atlasCard = publicPage
      .getByRole("article")
      .filter({ hasText: "Atlas Démo" });

    // Photo de la carte de visite, puis retour aux initiales.
    await page.goto("/admin/contenus");
    const photo = region(page, "Photo de la carte de visite");
    await pickMedia(page, photo, "Photo", "Atlas 1", item(1));
    await expect(photo.getByText("Modification non enregistrée")).toBeVisible();
    await photo.getByRole("button", { name: "Enregistrer" }).click();
    await expect(photo.getByRole("status")).toContainText(
      "Photo de profil enregistrée",
    );
    await publicPage.goto("/");
    await expect(
      card.getByRole("img", { name: "Capture fictive : Atlas 1" }),
    ).toBeVisible();
    await expect(initials).toHaveCount(0);

    await clearMedia(photo, "Photo");
    await photo.getByRole("button", { name: "Enregistrer" }).click();
    await expect(photo.getByRole("status")).toContainText("Photo retirée");
    // Cache public invalidé par l'action elle-même : un rechargement suffit.
    await publicPage.reload();
    await expect(initials).toHaveCount(1);

    // Illustration d'étape : affichée en entier (object-contain), puis retirée.
    await page.goto("/admin/timeline");
    const steps = region(page, /^Étapes/);
    await steps.getByText("Modifier").click();
    await pickMedia(
      page,
      steps,
      "Illustration (médiathèque)",
      "Atlas 2",
      item(2),
    );
    await steps.getByRole("button", { name: "Enregistrer" }).click();
    await expect(steps.getByRole("status")).toContainText("Étape enregistrée");
    await publicPage.reload();
    const illustration = publicPage
      .locator("#parcours")
      .getByRole("img", { name: "Capture fictive : Atlas 2" });
    await expect(illustration).toBeVisible();
    await expect(illustration).toHaveClass(/object-contain/);

    await clearMedia(steps, "Illustration (médiathèque)");
    await steps.getByRole("button", { name: "Enregistrer" }).click();
    // Même confirmation qu'avant : on attend l'effet réel côté public.
    await expect(async () => {
      await publicPage.reload();
      await expect(
        publicPage.locator("#parcours").getByRole("img"),
      ).toHaveCount(0);
    }).toPass();

    // Badge vert + logo importé sur un projet existant, puis valeurs d'origine.
    await page.goto("/admin/projets");
    await page
      .getByRole("link", { name: /Atlas Démo/ })
      .first()
      .click();
    const info = region(page, "Informations et publication");
    await info.getByLabel("Badge (facultatif)").fill("En ligne");
    await info.getByLabel("Couleur du badge").selectOption("success");
    await pickMedia(page, info, "Logo (médiathèque)", "Atlas 3", item(3));
    await info.getByRole("button", { name: "Enregistrer le projet" }).click();
    await expect(info.getByRole("status")).toContainText("Projet enregistré");
    await publicPage.reload();
    const badge = atlasCard.getByText("En ligne", { exact: true });
    await expect(badge).toBeVisible();
    await expect(badge).toHaveClass(/text-green-300/);
    // Logo : à côté du titre (et dans la couverture générée, faute de couverture).
    await expect(
      atlasCard.locator("img[aria-hidden='true']").first(),
    ).toBeVisible();

    await info.getByLabel("Badge (facultatif)").fill("");
    await info.getByLabel("Couleur du badge").selectOption("warning");
    await clearMedia(info, "Logo (médiathèque)");
    await info.getByRole("button", { name: "Enregistrer le projet" }).click();
    await expect(async () => {
      await publicPage.reload();
      await expect(
        atlasCard.getByText("En ligne", { exact: true }),
      ).toHaveCount(0);
      await expect(atlasCard.locator("img[aria-hidden='true']")).toHaveCount(0);
    }).toPass();
    await publicPage.close();
  });
});

test.describe("Messages", () => {
  test("consultation, changements de statut et suppression", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/admin/messages");
    await page.getByRole("link", { name: /Message de fixture/ }).click();
    await expect(page).toHaveURL(/\/admin\/messages\/[a-z0-9]+$/);
    await expect(
      page.getByText("Bonjour, ceci est un message fictif pour les tests."),
    ).toBeVisible();

    await page.getByRole("button", { name: "Marquer traité" }).click();
    await expect(page.getByRole("status")).toContainText("marqué comme traité");
    await page.getByRole("button", { name: "Marquer non lu" }).click();
    await expect(page.getByRole("status")).toContainText("marqué comme non lu");

    const dialog = page.getByRole("alertdialog");
    await page.getByRole("button", { name: "Supprimer", exact: true }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Annuler" }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Supprimer", exact: true }).click();
    await dialog
      .getByRole("button", { name: "Supprimer définitivement" })
      .click();
    await expect(page).toHaveURL(/\/admin\/messages$/);
    await expect(
      page.getByRole("link", { name: /Message de fixture/ }),
    ).toHaveCount(0);
  });
});
