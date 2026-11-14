import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { login, readFixtures } from "./support/helpers";

// Volume du seed : dossier « Volume » (150 images sans fichier) et « Volume / Lot A ».

const region = (page: Page, name: string | RegExp) =>
  page.getByRole("region", { name });
const folderNav = (page: Page) =>
  page.getByRole("navigation", { name: "Dossiers de la médiathèque" });

test.describe("Médiathèque : dossiers, recherche et pagination", () => {
  test("pagination serveur et recherche sur 150 médias", async ({ page }) => {
    await login(page);
    await page.goto("/admin/medias");
    await folderNav(page).getByRole("link", { name: "Volume (150)" }).click();
    await expect(page).toHaveURL(/dossier=/);
    const library = region(page, "Volume");
    await expect(library.getByText("150 média(s) — page 1 / 7")).toBeVisible();
    // 24 cartes au plus : jamais toute la bibliothèque.
    await expect(
      library.getByRole("checkbox", { name: /^Sélectionner/ }),
    ).toHaveCount(24);
    await expect(
      library.getByText("volume-150.png", { exact: true }),
    ).toBeVisible();

    await library.getByRole("link", { name: "Page suivante →" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(library.getByText("150 média(s) — page 2 / 7")).toBeVisible();
    await expect(
      library.getByText("volume-126.png", { exact: true }),
    ).toBeVisible();

    // Recherche dans le dossier (filtres conservés dans l'URL).
    await library
      .getByRole("searchbox", { name: "Rechercher" })
      .fill("volume-042");
    await library.getByRole("button", { name: "Filtrer" }).click();
    await expect(page).toHaveURL(/q=volume-042/);
    await expect(library.getByText("1 média(s) — page 1 / 1")).toBeVisible();
    await expect(
      library.getByText("volume-042.png", { exact: true }),
    ).toBeVisible();

    // Recherche sur le texte alternatif, puis filtre PDF sans résultat.
    await library
      .getByRole("searchbox", { name: "Rechercher" })
      .fill("Capture de volume 07");
    await library.getByRole("button", { name: "Filtrer" }).click();
    await expect(library.getByText("10 média(s) — page 1 / 1")).toBeVisible();
    await library.getByLabel("Type").selectOption("pdf");
    await library.getByRole("button", { name: "Filtrer" }).click();
    await expect(library.getByText(/Aucun média ne correspond/)).toBeVisible();

    // Recherche globale depuis un autre dossier.
    await page.goto(
      "/admin/medias?dossier=non-classes&q=volume-001&portee=tout",
    );
    await expect(
      page.getByText("volume-001.png", { exact: true }),
    ).toBeVisible();
  });

  test("dossiers : création, sous-dossier, profondeur, renommage, suppression sûre", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/admin/medias");
    const manage = region(page, "Gérer les dossiers");

    await manage.getByLabel("Nouveau dossier").fill("E2E Rangement");
    await manage.getByRole("button", { name: "Créer le dossier" }).click();
    await expect(manage.getByRole("status")).toContainText("créé");
    // Doublon refusé (insensible à la casse).
    await manage.getByLabel("Nouveau dossier").fill("e2e rangement");
    await manage.getByRole("button", { name: "Créer le dossier" }).click();
    await expect(manage.getByRole("alert")).toContainText("existe déjà");

    await folderNav(page)
      .getByRole("link", { name: "E2E Rangement (0)" })
      .click();
    await manage.getByLabel(/Nouveau sous-dossier/).fill("Sous-dossier");
    await manage.getByRole("button", { name: "Créer le dossier" }).click();
    await expect(manage.getByRole("status")).toContainText("créé");
    // Dossier non vide : pas de bouton de suppression, explication à la place.
    await expect(
      manage.getByText(/Suppression possible une fois le dossier vide/),
    ).toBeVisible();
    await expect(
      manage.getByRole("button", { name: /^Supprimer/ }),
    ).toHaveCount(0);

    await manage.getByLabel("Renommer ce dossier").fill("E2E Classement");
    await manage.getByRole("button", { name: "Renommer" }).click();
    await expect(
      folderNav(page).getByRole("link", { name: "E2E Classement (0)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Fil d'Ariane" }),
    ).toContainText("E2E Classement");

    // Profondeur : Volume / Lot A / Niveau 3, puis plus de sous-dossier possible.
    await folderNav(page).getByRole("link", { name: "Lot A (0)" }).click();
    await manage.getByLabel(/Nouveau sous-dossier/).fill("Niveau 3");
    await manage.getByRole("button", { name: "Créer le dossier" }).click();
    await folderNav(page).getByRole("link", { name: "Niveau 3 (0)" }).click();
    await expect(
      manage.getByText(/Profondeur maximale atteinte/),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Fil d'Ariane" }),
    ).toContainText(/Volume\s*\/\s*Lot A\s*\/\s*Niveau 3/);

    // Suppression d'un dossier vide, avec confirmation.
    await manage
      .getByRole("button", { name: "Supprimer « Niveau 3 »" })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Supprimer définitivement" })
      .click();
    await expect(
      folderNav(page).getByRole("link", { name: /Niveau 3/ }),
    ).toHaveCount(0);
    await expect(page.getByText("Ce dossier n'existe plus")).toBeVisible();

    await folderNav(page)
      .getByRole("link", { name: "Sous-dossier (0)" })
      .click();
    await manage
      .getByRole("button", { name: "Supprimer « Sous-dossier »" })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Supprimer définitivement" })
      .click();
    await folderNav(page)
      .getByRole("link", { name: "E2E Classement (0)" })
      .click();
    await manage
      .getByRole("button", { name: "Supprimer « E2E Classement »" })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Supprimer définitivement" })
      .click();
    await expect(
      folderNav(page).getByRole("link", { name: /E2E Classement/ }),
    ).toHaveCount(0);
  });

  test("déplacer un média utilisé ne change ni son adresse ni ses usages", async ({
    page,
    request,
  }) => {
    const { publicShot } = readFixtures();
    const url = `/media/${publicShot}`;
    expect((await request.get(url)).status()).toBe(200);

    await login(page);
    await page.goto("/admin/medias");
    const manage = region(page, "Gérer les dossiers");
    await manage.getByLabel("Nouveau dossier").fill("E2E Captures");
    await manage.getByRole("button", { name: "Créer le dossier" }).click();
    await expect(manage.getByRole("status")).toContainText("créé");

    await folderNav(page)
      .getByRole("link", { name: /^Non classés/ })
      .click();
    const library = region(page, "Non classés");
    await library
      .getByRole("checkbox", { name: "Sélectionner « Atlas 1.png »" })
      .check();
    await library
      .getByLabel("Déplacer la sélection vers")
      .selectOption({ label: "E2E Captures" });
    await library.getByRole("button", { name: "Déplacer" }).click();
    await expect(library.getByRole("status").first()).toContainText(
      "1 média(s) déplacé(s)",
    );

    // Même URL publique, toujours servie ; toujours utilisé dans la galerie.
    expect((await request.get(url)).status()).toBe(200);
    await folderNav(page)
      .getByRole("link", { name: "E2E Captures (1)" })
      .click();
    const moved = region(page, "E2E Captures");
    await expect(moved.getByText("Atlas 1.png", { exact: true })).toBeVisible();
    await expect(moved.getByText("utilisé (1)")).toBeVisible();
    // Dossier non vide : non supprimable.
    await expect(
      manage.getByRole("button", { name: /^Supprimer/ }),
    ).toHaveCount(0);

    // Retour dans « Non classés » puis suppression du dossier vide.
    await moved
      .getByRole("checkbox", { name: "Sélectionner « Atlas 1.png »" })
      .check();
    await moved
      .getByLabel("Déplacer la sélection vers")
      .selectOption({ label: "Non classés" });
    await moved.getByRole("button", { name: "Déplacer" }).click();
    await expect(
      moved.getByText(/Ce dossier ne contient aucun média/),
    ).toBeVisible();
    await page.reload();
    await manage
      .getByRole("button", { name: "Supprimer « E2E Captures »" })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Supprimer définitivement" })
      .click();
    await expect(
      folderNav(page).getByRole("link", { name: /E2E Captures/ }),
    ).toHaveCount(0);
    expect((await request.get(url)).status()).toBe(200);
  });
});

test.describe("Sélecteur universel", () => {
  test("clavier, Échap sans modification et accessibilité", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/admin/contenus");
    const photo = region(page, "Photo de la carte de visite");
    const field = photo.getByRole("group", { name: "Photo", exact: true });
    const opener = field.getByRole("button", { name: "Choisir un média…" });
    await opener.click();

    const dialog = page.getByRole("dialog", { name: "Photo" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("searchbox")).toBeFocused();
    await expect(dialog.getByText(/média\(s\) — page 1 \//)).toBeVisible();
    // Images seulement : aucun filtre de type proposé, aucun PDF listé.
    await expect(dialog.getByLabel("Type de média")).toHaveCount(0);

    const { violations } = await new AxeBuilder({ page })
      .include("dialog[open]")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      ),
    ).toEqual([]);

    // Sélection au clavier puis Échap : rien n'est transmis au formulaire.
    await dialog.getByRole("searchbox").fill("Atlas 2");
    const item = dialog.getByRole("button", { name: /^Atlas 2\.png/ });
    await item.focus();
    await page.keyboard.press("Enter");
    await expect(item).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(field.getByText("Aucune (initiales CL)")).toBeVisible();
    await expect(photo.getByText("Modification non enregistrée")).toHaveCount(
      0,
    );
  });

  test("sélection multiple conservée entre pages, sans doublon, ajout à la galerie", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/admin/medias/projets");
    const draft = region(page, /^Projet brouillon/);
    await draft.getByRole("button", { name: "Choisir des images…" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Images à ajouter à la galerie",
    });
    await expect(dialog).toBeVisible();

    // L'image déjà dans la galerie n'est pas proposée à nouveau.
    await dialog.getByRole("searchbox").fill("Brouillon");
    await expect(
      dialog.getByRole("button", { name: /déjà dans la galerie/ }),
    ).toBeDisabled();
    await dialog.getByRole("searchbox").fill("");

    const nav = dialog.getByRole("navigation", {
      name: "Dossiers de la médiathèque",
    });
    await nav.getByRole("button", { name: "Volume (150)" }).click();
    await expect(dialog.getByText("150 média(s) — page 1 / 7")).toBeVisible();
    await dialog.getByRole("button", { name: /^volume-150\.png/ }).click();
    await dialog.getByRole("button", { name: /^volume-149\.png/ }).click();
    await dialog.getByRole("button", { name: "Suivante" }).click();
    await expect(dialog.getByText("150 média(s) — page 2 / 7")).toBeVisible();
    await dialog.getByRole("button", { name: /^volume-126\.png/ }).click();

    // Retour en page 1 : la sélection est intacte.
    await dialog.getByRole("button", { name: "Précédente" }).click();
    await expect(
      dialog.getByRole("button", { name: /^volume-150\.png/ }),
    ).toHaveAttribute("aria-pressed", "true");
    // Changement de dossier : sélection conservée.
    await nav.getByRole("button", { name: /^Non classés/ }).click();
    await expect(
      dialog.getByRole("button", { name: "Valider la sélection (3)" }),
    ).toBeEnabled();
    await dialog
      .getByRole("button", { name: "Valider la sélection (3)" })
      .click();
    await expect(dialog).toBeHidden();

    // Rien n'est enregistré avant l'envoi du formulaire.
    await expect(draft.getByText("Galerie (1)")).toBeVisible();
    const pending = draft.getByRole("list", { name: "Images à ajouter" });
    await expect(pending.getByRole("listitem")).toHaveCount(3);
    await pending
      .getByRole("button", { name: "Ne pas ajouter « volume-149.png »" })
      .click();
    await draft
      .getByRole("button", { name: "Ajouter 2 image(s) à la galerie" })
      .click();
    // Le formulaire est remonté (nouvelle galerie) : le compteur fait foi.
    await expect(draft.getByText("Galerie (3)")).toBeVisible();
  });
});
