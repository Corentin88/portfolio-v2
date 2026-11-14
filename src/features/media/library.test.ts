import { describe, expect, it } from "vitest";
import {
  buildMediaOrderBy,
  buildMediaWhere,
  descendantIds,
  flattenFolderTree,
  folderPath,
  mediaQueryHref,
  pageCountFor,
  parseMediaQuery,
  UNCLASSIFIED,
  type FolderRow,
} from "@/features/media/library";

// Projets / MonFluxRSS / V2, Profil
const folders: FolderRow[] = [
  { id: "projets", name: "Projets", parentId: null },
  { id: "rss", name: "MonFluxRSS", parentId: "projets" },
  { id: "v2", name: "V2", parentId: "rss" },
  { id: "v1", name: "V1", parentId: "rss" },
  { id: "profil", name: "Profil", parentId: null },
];

describe("arborescence des dossiers", () => {
  it("construit le fil d'Ariane de la racine au dossier", () => {
    expect(folderPath(folders, "v2").map((f) => f.name)).toEqual([
      "Projets",
      "MonFluxRSS",
      "V2",
    ]);
    expect(folderPath(folders, "inconnu")).toEqual([]);
  });

  it("ne boucle pas sur une donnée corrompue formant un cycle", () => {
    const cyclic: FolderRow[] = [
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
    ];
    expect(folderPath(cyclic, "a").length).toBeLessThanOrEqual(2);
    expect(descendantIds(cyclic, "a").sort()).toEqual(["a", "b"]);
    expect(flattenFolderTree(cyclic)).toEqual([]);
  });

  it("liste un dossier et tous ses descendants", () => {
    expect(descendantIds(folders, "projets").sort()).toEqual(
      ["projets", "rss", "v1", "v2"].sort(),
    );
    expect(descendantIds(folders, "profil")).toEqual(["profil"]);
  });

  it("aplatit l'arbre en profondeur, frères triés par nom", () => {
    expect(
      flattenFolderTree(folders).map((f) => `${f.depth}:${f.name}`),
    ).toEqual(["1:Profil", "1:Projets", "2:MonFluxRSS", "3:V1", "3:V2"]);
  });
});

describe("paramètres de navigation", () => {
  it("applique les valeurs par défaut et ignore les valeurs invalides", () => {
    expect(
      parseMediaQuery({ type: "svg", tri: "random", page: "-3", q: "  logo " }),
    ).toEqual({
      dossier: "",
      q: "logo",
      portee: "dossier",
      type: "tous",
      tri: "recents",
      page: 1,
      vue: "tous",
    });
    expect(
      parseMediaQuery(new URLSearchParams("dossier=v2&page=4&tri=nom")),
    ).toMatchObject({ dossier: "v2", page: 4, tri: "nom" });
  });

  it("ne garde dans l'URL que les paramètres utiles", () => {
    const query = parseMediaQuery({ dossier: "v2", q: "accueil" });
    expect(mediaQueryHref("/admin/medias", query)).toBe(
      "/admin/medias?dossier=v2&q=accueil",
    );
    expect(mediaQueryHref("/admin/medias", query, { dossier: "", q: "" })).toBe(
      "/admin/medias",
    );
  });

  it("compte au moins une page", () => {
    expect(pageCountFor(0)).toBe(1);
    expect(pageCountFor(24)).toBe(1);
    expect(pageCountFor(25)).toBe(2);
    expect(pageCountFor(150)).toBe(7);
  });
});

describe("filtres Prisma", () => {
  const where = (params: Record<string, string>) =>
    buildMediaWhere(parseMediaQuery(params), folders);

  it("sans filtre : toute la médiathèque", () => {
    expect(where({})).toEqual({});
  });

  it("navigation : contenu direct du dossier ; non classés : sans dossier", () => {
    expect(where({ dossier: "rss" })).toEqual({ AND: [{ folderId: "rss" }] });
    expect(where({ dossier: UNCLASSIFIED })).toEqual({
      AND: [{ folderId: null }],
    });
  });

  it("recherche dans le dossier et ses sous-dossiers, par nom ou texte alternatif", () => {
    const result = where({ dossier: "rss", q: "accueil", type: "images" });
    expect(result).toEqual({
      AND: [
        { kind: "IMAGE" },
        {
          OR: [
            { originalName: { contains: "accueil" } },
            { alt: { contains: "accueil" } },
          ],
        },
        { folderId: { in: ["rss", "v2", "v1"] } },
      ],
    });
  });

  it("recherche globale : ignore le dossier courant", () => {
    expect(
      where({ dossier: "rss", q: "cv", portee: "tout", type: "pdf" }),
    ).toEqual({
      AND: [
        { kind: "DOCUMENT" },
        {
          OR: [
            { originalName: { contains: "cv" } },
            { alt: { contains: "cv" } },
          ],
        },
      ],
    });
  });

  it("vue « non utilisés » : aucun usage, quel qu'il soit", () => {
    const result = where({ vue: "inutilises" }) as {
      AND: Array<Record<string, unknown>>;
    };
    expect(Object.keys(result.AND[0]!)).toEqual([
      "projectCovers",
      "projectIcons",
      "versionCovers",
      "screenshots",
      "settingsAsCv",
      "settingsAsOgImage",
      "settingsAsProfile",
      "timelineEntries",
    ]);
  });

  it("trie de façon stable (identifiant en départage)", () => {
    expect(buildMediaOrderBy("recents")).toEqual([
      { createdAt: "desc" },
      { id: "desc" },
    ]);
    expect(buildMediaOrderBy("anciens")[0]).toEqual({ createdAt: "asc" });
    expect(buildMediaOrderBy("nom")).toEqual([
      { originalName: "asc" },
      { id: "asc" },
    ]);
  });
});
