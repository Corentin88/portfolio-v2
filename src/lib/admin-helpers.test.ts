import { describe, expect, it } from "vitest";
import { moveInList, nextPosition } from "@/lib/reorder";
import { slugify } from "@/lib/slug";
import {
  checkbox,
  formDataToObject,
  isSafeExternalUrl,
  optionalHttpUrl,
  optionalText,
} from "@/lib/validation";

describe("moveInList", () => {
  const items = [
    { id: "a", position: 0 },
    { id: "b", position: 1 },
    { id: "c", position: 2 },
  ];

  it("échange un élément avec son voisin, sans réécrire les autres", () => {
    expect(moveInList(items, "b", "up")).toEqual([
      { id: "b", position: 0 },
      { id: "a", position: 1 },
    ]);
  });

  it("refuse de sortir de la liste", () => {
    expect(moveInList(items, "a", "up")).toBeNull();
    expect(moveInList(items, "c", "down")).toBeNull();
    expect(moveInList(items, "inconnu", "up")).toBeNull();
  });

  it("renumérote des positions en double ou trouées", () => {
    const messy = [
      { id: "a", position: 5 },
      { id: "b", position: 5 },
      { id: "c", position: 9 },
    ];
    // a:5→0, c (remonté):9→1, b:5→2 — toutes les positions changent.
    expect(moveInList(messy, "c", "up")).toEqual([
      { id: "a", position: 0 },
      { id: "c", position: 1 },
      { id: "b", position: 2 },
    ]);
  });
});

describe("nextPosition", () => {
  it("place un nouvel élément en fin de liste", () => {
    expect(nextPosition(null)).toBe(0);
    expect(nextPosition(4)).toBe(5);
  });
});

describe("slugify", () => {
  it("produit un slug sans accents ni ponctuation", () => {
    expect(slugify("Outils & DevOps")).toBe("outils-devops");
    expect(slugify("Bases de données")).toBe("bases-de-donnees");
    expect(slugify("Next.js")).toBe("next-js");
    expect(slugify("!!!")).toBe("");
  });
});

describe("validation des formulaires", () => {
  it("interprète une case à cocher absente comme décochée", () => {
    expect(checkbox().parse("on")).toBe(true);
    expect(checkbox().parse(undefined)).toBe(false);
  });

  it("enregistre un texte facultatif vide comme null", () => {
    expect(optionalText(10).parse("   ")).toBeNull();
    expect(optionalText(10).safeParse("x".repeat(11)).success).toBe(false);
  });

  it("n'accepte que des URL http(s)", () => {
    expect(optionalHttpUrl().parse("")).toBeNull();
    expect(optionalHttpUrl().parse("https://github.com/x")).toBe(
      "https://github.com/x",
    );
    expect(optionalHttpUrl().safeParse("javascript:alert(1)").success).toBe(
      false,
    );
  });

  it("refuse les adresses à identifiants intégrés ou sans hôte", () => {
    expect(isSafeExternalUrl("https://exemple.fr/page?x=1")).toBe(true);
    expect(isSafeExternalUrl("http://localhost:3000")).toBe(true);
    expect(isSafeExternalUrl("https://a:b@exemple.fr")).toBe(false);
    expect(isSafeExternalUrl("https:exemple.fr")).toBe(true);
    expect(isSafeExternalUrl("mailto:x@exemple.fr")).toBe(false);
    expect(isSafeExternalUrl("//exemple.fr")).toBe(false);
  });

  it("ignore les champs techniques des Server Actions", () => {
    const data = new FormData();
    data.set("title", "Titre");
    data.set("$ACTION_ID_abc", "");
    expect(formDataToObject(data)).toEqual({ title: "Titre" });
  });
});
