import { describe, expect, it } from "vitest";
import {
  comparePair,
  monogramFor,
  pickVersion,
  projectCategoryFilters,
  toProjectCard,
  toProjectDetail,
  type ProjectDetailRow,
  type ProjectRow,
} from "@/features/projects/public-view";

function project(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: "p1",
    slug: "projet",
    title: "Projet",
    summary: "Résumé",
    context: null,
    badgeLabel: null,
    badgeTone: "warning",
    iconKey: "code",
    featured: false,
    category: { name: "Web app", slug: "web-app", position: 0 },
    coverMedia: null,
    iconMedia: null,
    versions: [
      { label: "Version 1", technologies: [{ technology: { name: "PHP" } }] },
      {
        label: "Version 2",
        technologies: [
          { technology: { name: "Next.js" } },
          { technology: { name: "TypeScript" } },
        ],
      },
    ],
    ...overrides,
  };
}

describe("monogramFor", () => {
  it("reprend les deux premières lettres, accents compris", () => {
    expect(monogramFor("Bénévolink")).toBe("Bé");
    expect(monogramFor("  météo app")).toBe("Mé");
    expect(monogramFor("X")).toBe("X");
  });
});

describe("toProjectCard", () => {
  it("présente la version publiée la plus récente", () => {
    const card = toProjectCard(project());
    expect(card?.versionCount).toBe(2);
    expect(card?.latestVersionLabel).toBe("Version 2");
    expect(card?.technologies).toEqual(["Next.js", "TypeScript"]);
  });

  it("écarte un projet sans version publiée", () => {
    expect(toProjectCard(project({ versions: [] }))).toBeNull();
  });

  it("garde l'icône du catalogue sans logo importé", () => {
    const card = toProjectCard(project());
    expect(card?.iconImage).toBeNull();
    expect(card?.iconKey).toBe("code");
  });

  it("utilise le logo importé (miniature) quand il existe", () => {
    const card = toProjectCard(
      project({
        iconMedia: {
          storageKey: `images/2026/11/${"c".repeat(32)}.webp`,
          width: 512,
          height: 256,
          alt: "Logo Météo",
        },
      }),
    );
    expect(card?.iconImage).toMatchObject({
      width: 512,
      height: 256,
      alt: "Logo Météo",
    });
    expect(card?.iconImage?.src).toMatch(/^\/media\/.+\.w960\.webp$/);
  });

  it("transmet la couleur du badge et retombe sur l'ambre si elle est inconnue", () => {
    expect(toProjectCard(project({ badgeTone: "success" }))?.badgeTone).toBe(
      "success",
    );
    expect(toProjectCard(project({ badgeTone: "rose" }))?.badgeTone).toBe(
      "warning",
    );
  });
});

describe("projectCategoryFilters", () => {
  it("compte les projets par catégorie, dans l'ordre de l'administration", () => {
    const filters = projectCategoryFilters([
      project({
        category: { name: "Site vitrine", slug: "vitrine", position: 2 },
      }),
      project({ category: { name: "Web app", slug: "web-app", position: 0 } }),
      project({ category: { name: "Web app", slug: "web-app", position: 0 } }),
    ]);
    expect(filters).toEqual([
      { name: "Web app", slug: "web-app", count: 2 },
      { name: "Site vitrine", slug: "vitrine", count: 1 },
    ]);
  });
});

describe("fiche détaillée", () => {
  const image = (key: string) => ({
    storageKey: `images/2026/11/${key.padEnd(32, "0")}.webp`,
    width: 1920,
    height: 1080,
    alt: `Alt ${key}`,
  });

  const version = (
    slug: string,
    overrides: Partial<ProjectDetailRow["versions"][number]> = {},
  ): ProjectDetailRow["versions"][number] => ({
    slug,
    label: slug.toUpperCase(),
    periodLabel: null,
    releasedAt: null,
    description: "Description",
    sourceUrl: null,
    demoUrl: null,
    coverMedia: null,
    highlights: [],
    challenges: [],
    technologies: [],
    screenshots: [],
    ...overrides,
  });

  const detail = (
    versions: ProjectDetailRow["versions"],
  ): ProjectDetailRow => ({
    slug: "meteo",
    title: "Météo",
    summary: "Résumé",
    context: null,
    badgeLabel: null,
    badgeTone: "warning",
    iconKey: "cloud-sun",
    seoTitle: null,
    seoDescription: null,
    category: { name: "Web app", slug: "web-app" },
    coverMedia: image("a"),
    iconMedia: null,
    versions,
  });

  it("ne produit rien sans version publiée", () => {
    expect(toProjectDetail(detail([]))).toBeNull();
  });

  it("sépare fonctionnalités et améliorations, et formate la période", () => {
    const result = toProjectDetail(
      detail([
        version("v1", {
          releasedAt: new Date("2025-03-14T00:00:00Z"),
          highlights: [
            { kind: "FEATURE", text: "Connexion" },
            { kind: "IMPROVEMENT", text: "Plus rapide" },
          ],
          technologies: [{ technology: { name: "Next.js" } }],
        }),
      ]),
    )!;
    const [v1] = result.versions;
    expect(v1!.period).toBe("mars 2025");
    expect(v1!.features).toEqual(["Connexion"]);
    expect(v1!.improvements).toEqual(["Plus rapide"]);
    expect(v1!.technologies).toEqual(["Next.js"]);
    // Sans couverture propre : repli sur la couverture du projet.
    expect(v1!.cover?.alt).toBe("Alt a");
  });

  it("préfère la période saisie à la date", () => {
    const result = toProjectDetail(
      detail([
        version("v1", {
          periodLabel: "2023 – 2024",
          releasedAt: new Date("2024-01-01T00:00:00Z"),
        }),
      ]),
    )!;
    expect(result.versions[0]!.period).toBe("2023 – 2024");
  });

  it("garde le texte alternatif de la capture et fournit la miniature", () => {
    const result = toProjectDetail(
      detail([
        version("v1", {
          screenshots: [
            { alt: "Accueil", caption: " Légende ", media: image("b") },
            { alt: null, caption: null, media: { ...image("c"), width: null } },
          ],
        }),
      ]),
    )!;
    const shots = result.versions[0]!.screenshots;
    // Image sans dimensions ignorée (évite tout décalage de mise en page).
    expect(shots).toHaveLength(1);
    expect(shots[0]!.alt).toBe("Accueil");
    expect(shots[0]!.caption).toBe("Légende");
    expect(shots[0]!.thumbnailSrc).toMatch(/\.w960\.webp$/);
  });

  it("choisit la version demandée, sinon la plus récente", () => {
    const { versions } = toProjectDetail(
      detail([version("v1"), version("v2")]),
    )!;
    expect(pickVersion(versions, "v1")?.slug).toBe("v1");
    expect(pickVersion(versions, "v9")?.slug).toBe("v2");
    expect(pickVersion(versions, null)?.slug).toBe("v2");
  });

  it("ne propose la comparaison qu'entre deux versions illustrées", () => {
    const shot = { alt: null, caption: null, media: image("d") };
    const illustrated = toProjectDetail(
      detail([
        version("v1", { screenshots: [shot] }),
        version("v2"),
        version("v3", { screenshots: [shot] }),
      ]),
    )!;
    const pair = comparePair(illustrated.versions);
    expect(pair?.from.slug).toBe("v1");
    expect(pair?.to.slug).toBe("v3");

    const missing = toProjectDetail(
      detail([version("v1", { screenshots: [shot] }), version("v2")]),
    )!;
    expect(comparePair(missing.versions)).toBeNull();
    expect(
      comparePair(
        toProjectDetail(detail([version("v1", { screenshots: [shot] })]))!
          .versions,
      ),
    ).toBeNull();
  });
});
