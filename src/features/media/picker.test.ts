import { describe, expect, it } from "vitest";
import {
  toggleSelection,
  toPickerMedia,
  toPickerValue,
  typeFilterFor,
  type PickerMedia,
} from "@/features/media/picker";

const KEY = `images/2026/11/${"a".repeat(32)}.webp`;

function media(id: string, kind: "IMAGE" | "DOCUMENT" = "IMAGE"): PickerMedia {
  return {
    id,
    kind,
    name: `${id}.png`,
    alt: id,
    thumbSrc: kind === "IMAGE" ? `/media/${id}.w960.webp` : null,
    src: `/media/${id}`,
    width: 100,
    height: 100,
    sizeBytes: 1000,
    folderId: null,
    usageCount: 0,
  };
}

describe("sélection simple", () => {
  const options = { multiple: false, accept: "IMAGE" as const };

  it("remplace le choix, et le retire au second clic", () => {
    let selection = toggleSelection([], media("a"), options);
    selection = toggleSelection(selection, media("b"), options);
    expect(selection.map((m) => m.id)).toEqual(["b"]);
    expect(toggleSelection(selection, media("b"), options)).toEqual([]);
  });

  it("refuse un type non accepté (PDF pour une couverture, image pour le CV)", () => {
    expect(toggleSelection([], media("cv", "DOCUMENT"), options)).toEqual([]);
    expect(
      toggleSelection([], media("img"), {
        multiple: false,
        accept: "DOCUMENT",
      }),
    ).toEqual([]);
    expect(
      toggleSelection([], media("cv", "DOCUMENT"), {
        multiple: false,
        accept: "ALL",
      }),
    ).toHaveLength(1);
  });
});

describe("sélection multiple", () => {
  const options = {
    multiple: true,
    accept: "IMAGE" as const,
    excluded: new Set(["deja"]),
  };

  it("conserve l'ordre de sélection et retire sans doublon", () => {
    let selection: PickerMedia[] = [];
    for (const id of ["c", "a", "b"]) {
      selection = toggleSelection(selection, media(id), options);
    }
    expect(selection.map((m) => m.id)).toEqual(["c", "a", "b"]);
    selection = toggleSelection(selection, media("a"), options);
    expect(selection.map((m) => m.id)).toEqual(["c", "b"]);
  });

  it("garde la sélection d'une page ou d'un dossier à l'autre (objets distincts, même id)", () => {
    // Page 1 puis page 2 : les médias sont des objets reçus de requêtes différentes.
    let selection = toggleSelection([], media("p1"), options);
    selection = toggleSelection(selection, media("p2"), options);
    // Retour en page 1 : le même média (nouvel objet) est reconnu comme déjà choisi.
    selection = toggleSelection(selection, { ...media("p1") }, options);
    expect(selection.map((m) => m.id)).toEqual(["p2"]);
  });

  it("ignore un média déjà dans la galerie", () => {
    expect(toggleSelection([], media("deja"), options)).toEqual([]);
  });
});

describe("format du sélecteur", () => {
  it("expose la miniature d'une image, jamais un chemin disque", () => {
    const item = toPickerMedia({
      id: "m1",
      kind: "IMAGE",
      storageKey: KEY,
      originalName: "accueil.png",
      alt: "Accueil",
      width: 1600,
      height: 900,
      sizeBytes: 2048,
      folderId: "f1",
      projectCovers: [{ title: "Météo" }],
      projectIcons: [],
      versionCovers: [],
      screenshots: [],
      settingsAsCv: [],
      settingsAsOgImage: [],
      settingsAsProfile: [],
      timelineEntries: [],
    });
    expect(item.thumbSrc).toBe(
      `/media/images/2026/11/${"a".repeat(32)}.w960.webp`,
    );
    expect(item.src).toBe(`/media/${KEY}`);
    expect(item.usageCount).toBe(1);
    expect(item.folderId).toBe("f1");
  });

  it("construit la valeur initiale d'un champ (image ou PDF)", () => {
    expect(toPickerValue(null)).toBeNull();
    expect(
      toPickerValue({ id: "m1", storageKey: KEY, alt: "Portrait" }),
    ).toMatchObject({ kind: "IMAGE", name: "Portrait" });
    expect(
      toPickerValue({
        id: "cv",
        storageKey: `documents/${"b".repeat(32)}.pdf`,
        alt: "",
        originalName: "cv.pdf",
      }),
    ).toEqual({
      id: "cv",
      kind: "DOCUMENT",
      name: "cv.pdf",
      alt: "",
      thumbSrc: null,
    });
  });

  it("impose le filtre de type du contexte", () => {
    expect(typeFilterFor("IMAGE")).toBe("images");
    expect(typeFilterFor("DOCUMENT")).toBe("pdf");
    expect(typeFilterFor("ALL")).toBe("tous");
  });
});
