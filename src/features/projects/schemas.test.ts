import { describe, expect, it } from "vitest";
import {
  projectCreateSchema,
  versionCreateSchema,
  versionUpdateSchema,
} from "@/features/projects/schemas";
import { formDataToObject } from "@/lib/validation";

const project = {
  title: "Bénévolink",
  slug: "",
  summary: "Plateforme de bénévolat.",
  context: "",
  badgeLabel: "",
  badgeTone: "warning",
  iconKey: "hand-heart",
  iconMediaId: "",
  categoryId: "cat1",
  seoTitle: "",
  seoDescription: "",
};

const version = {
  id: "v1",
  slug: "v2",
  label: "V2",
  periodLabel: "",
  releasedAt: "",
  description: "Refonte.",
  sourceUrl: "",
  demoUrl: "",
  status: "DRAFT",
};

describe("projectCreateSchema", () => {
  it("accepte un slug vide (dérivé du titre) et normalise les champs facultatifs", () => {
    const data = projectCreateSchema.parse(project);
    expect(data.slug).toBe("");
    expect(data.context).toBeNull();
    expect(data.featured).toBe(false);
  });

  it("refuse un slug mal formé et une icône inconnue", () => {
    expect(
      projectCreateSchema.safeParse({ ...project, slug: "mon projet" }).success,
    ).toBe(false);
    expect(
      projectCreateSchema.safeParse({ ...project, slug: "-projet" }).success,
    ).toBe(false);
    expect(
      projectCreateSchema.safeParse({ ...project, iconKey: "skull" }).success,
    ).toBe(false);
  });

  it("accepte les cinq variantes de badge et refuse une couleur libre", () => {
    for (const badgeTone of [
      "success",
      "warning",
      "danger",
      "info",
      "neutral",
    ]) {
      expect(
        projectCreateSchema.safeParse({ ...project, badgeTone }).success,
      ).toBe(true);
    }
    expect(
      projectCreateSchema.safeParse({ ...project, badgeTone: "#ff0000" })
        .success,
    ).toBe(false);
  });

  it("traite un logo vide comme « aucun » (icône du catalogue)", () => {
    expect(projectCreateSchema.parse(project).iconMediaId).toBeNull();
    expect(
      projectCreateSchema.parse({ ...project, iconMediaId: "media1" })
        .iconMediaId,
    ).toBe("media1");
  });

  it("met le slug en minuscules", () => {
    expect(
      projectCreateSchema.parse({ ...project, slug: "Mon-Projet" }).slug,
    ).toBe("mon-projet");
  });

  it("exige une catégorie", () => {
    expect(
      projectCreateSchema.safeParse({ ...project, categoryId: "" }).success,
    ).toBe(false);
  });
});

describe("versionUpdateSchema", () => {
  it("découpe les points clés ligne par ligne et ignore les lignes vides", () => {
    const data = versionUpdateSchema.parse({
      ...version,
      features: "Connexion\r\n\n  Tableau de bord  \n",
      improvements: "",
    });
    expect(data.features).toEqual(["Connexion", "Tableau de bord"]);
    expect(data.improvements).toEqual([]);
    expect(data.technologyIds).toEqual([]);
  });

  it("lit les technologies cochées (champ répété), sans doublon, dans l'ordre", () => {
    const form = new FormData();
    form.append("technologyIds", "t2");
    form.append("technologyIds", "t1");
    form.append("technologyIds", "t2");
    const values = formDataToObject(form);
    expect(values.technologyIds).toBe("t2,t1,t2");
    const data = versionUpdateSchema.parse({ ...version, ...values });
    expect(data.technologyIds).toEqual(["t2", "t1"]);
  });

  it("refuse une ligne trop longue", () => {
    expect(
      versionUpdateSchema.safeParse({
        ...version,
        features: "x".repeat(301),
      }).success,
    ).toBe(false);
  });

  it("valide les liens externes", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,x",
      "https://user:secret@example.com",
      "ftp://example.com",
      "https://exa mple.com",
      "https://",
    ]) {
      expect(
        versionUpdateSchema.safeParse({ ...version, demoUrl: url }).success,
        url,
      ).toBe(false);
    }
    const data = versionUpdateSchema.parse({
      ...version,
      sourceUrl: "https://github.com/compte/projet",
    });
    expect(data.sourceUrl).toBe("https://github.com/compte/projet");
    expect(data.demoUrl).toBeNull();
  });

  it("convertit la date de sortie et refuse une date impossible", () => {
    expect(
      versionUpdateSchema.parse({ ...version, releasedAt: "2025-03-14" })
        .releasedAt,
    ).toEqual(new Date("2025-03-14T00:00:00Z"));
    expect(
      versionUpdateSchema.safeParse({ ...version, releasedAt: "2025-02-30" })
        .success,
    ).toBe(false);
  });

  it("refuse un statut inconnu", () => {
    expect(
      versionUpdateSchema.safeParse({ ...version, status: "DELETED" }).success,
    ).toBe(false);
  });
});

describe("versionCreateSchema", () => {
  it("exige un slug de version valide", () => {
    // Champs inconnus (id, statut) ignorés par le schéma de création.
    const input = { ...version, projectId: "p1" };
    expect(versionCreateSchema.parse(input).slug).toBe("v2");
    expect(versionCreateSchema.safeParse({ ...input, slug: "" }).success).toBe(
      false,
    );
    expect(
      versionCreateSchema.safeParse({ ...input, slug: "v 2" }).success,
    ).toBe(false);
  });
});
