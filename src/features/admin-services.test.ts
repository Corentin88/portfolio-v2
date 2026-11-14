import { beforeEach, describe, expect, it, vi } from "vitest";

// Base simulée : chaque modèle expose les méthodes utilisées par les services.
const db = vi.hoisted(() => {
  const model = () => ({
    aggregate: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  });
  return {
    project: model(),
    projectCategory: model(),
    technology: model(),
    versionTechnology: model(),
    skillCategory: model(),
    timelineEntry: model(),
    siteSettings: model(),
    media: model(),
    $transaction: vi.fn(),
  };
});
vi.mock("@/lib/db", () => ({ db }));

import { deleteProjectCategory } from "@/features/projects/category-service";
import { updateSiteSettings } from "@/features/site-settings/service";
import { deleteSkillCategory } from "@/features/skills/skill-category-service";
import {
  createTechnology,
  deleteTechnology,
} from "@/features/skills/technology-service";
import {
  createTimelineEntry,
  moveTimelineEntry,
  updateTimelineEntry,
} from "@/features/timeline/service";
import { DomainError } from "@/lib/errors";

const prismaError = (code: string) => Object.assign(new Error(code), { code });

beforeEach(() => {
  for (const value of Object.values(db)) {
    if (typeof value === "function") value.mockReset();
    else for (const method of Object.values(value)) method.mockReset();
  }
});

describe("suppression des catégories de projets", () => {
  it("est refusée tant qu'un projet utilise la catégorie", async () => {
    db.project.count.mockResolvedValue(2);
    await expect(deleteProjectCategory("cat-1")).rejects.toThrow(
      /utilisée par 2 projet/,
    );
    expect(db.projectCategory.delete).not.toHaveBeenCalled();
  });

  it("est acceptée pour une catégorie vide", async () => {
    db.project.count.mockResolvedValue(0);
    await deleteProjectCategory("cat-1");
    expect(db.projectCategory.delete).toHaveBeenCalledWith({
      where: { id: "cat-1" },
    });
  });

  it("reste protégée si un projet est ajouté entre le contrôle et la suppression", async () => {
    db.project.count.mockResolvedValue(0);
    db.projectCategory.delete.mockRejectedValue(prismaError("P2003"));
    await expect(deleteProjectCategory("cat-1")).rejects.toBeInstanceOf(
      DomainError,
    );
  });
});

describe("technologies", () => {
  it("refuse de supprimer une technologie utilisée par une version", async () => {
    db.versionTechnology.count.mockResolvedValue(1);
    await expect(deleteTechnology("tech-1")).rejects.toThrow(/1 version/);
    expect(db.technology.delete).not.toHaveBeenCalled();
  });

  it("crée la technologie en fin de sa catégorie, avec un slug", async () => {
    db.technology.aggregate.mockResolvedValue({ _max: { skillPosition: 3 } });
    await createTechnology({
      name: "Vitest",
      skillCategoryId: "cat-1",
      showInSkills: true,
    });
    expect(db.technology.create).toHaveBeenCalledWith({
      data: {
        name: "Vitest",
        skillCategoryId: "cat-1",
        showInSkills: true,
        slug: "vitest",
        skillPosition: 4,
      },
    });
  });

  it("signale un nom déjà utilisé", async () => {
    db.technology.aggregate.mockResolvedValue({
      _max: { skillPosition: null },
    });
    db.technology.create.mockRejectedValue(prismaError("P2002"));
    await expect(
      createTechnology({
        name: "React",
        skillCategoryId: null,
        showInSkills: true,
      }),
    ).rejects.toThrow("Une technologie porte déjà ce nom.");
  });
});

describe("catégories de compétences", () => {
  it("se suppriment en conservant leurs technologies (passage dans « Autres »)", async () => {
    db.technology.count.mockResolvedValue(3);
    await expect(deleteSkillCategory("sc-1")).resolves.toBe(3);
    expect(db.technology.delete).not.toHaveBeenCalled();
  });
});

describe("timeline", () => {
  it("ajoute une étape en fin de liste", async () => {
    db.timelineEntry.aggregate.mockResolvedValue({ _max: { position: 6 } });
    await createTimelineEntry({
      periodLabel: "2027",
      title: "Étape",
      description: "Texte",
      iconKey: "code",
      imageMediaId: null,
      isVisible: false,
    });
    expect(db.timelineEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ position: 7, isVisible: false }),
    });
    expect(db.media.findUnique).not.toHaveBeenCalled();
  });

  const entry = {
    periodLabel: "2024",
    title: "Formation Alt",
    description: "Texte",
    iconKey: "alt" as const,
    isVisible: true,
  };

  it("associe une illustration de la médiathèque", async () => {
    db.media.findUnique.mockResolvedValue({ kind: "IMAGE" });
    await updateTimelineEntry("t1", { ...entry, imageMediaId: "m1" });
    expect(db.timelineEntry.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: expect.objectContaining({ imageMediaId: "m1" }),
    });
  });

  it("retire l'illustration (retour à l'icône)", async () => {
    await updateTimelineEntry("t1", { ...entry, imageMediaId: null });
    expect(db.timelineEntry.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: expect.objectContaining({ imageMediaId: null }),
    });
  });

  it("refuse un PDF ou un média disparu comme illustration", async () => {
    db.media.findUnique.mockResolvedValueOnce({ kind: "DOCUMENT" });
    await expect(
      createTimelineEntry({ ...entry, imageMediaId: "m1" }),
    ).rejects.toThrow(/une image/);
    db.media.findUnique.mockResolvedValueOnce(null);
    await expect(
      updateTimelineEntry("t1", { ...entry, imageMediaId: "m2" }),
    ).rejects.toThrow(/n'existe plus/);
    expect(db.timelineEntry.create).not.toHaveBeenCalled();
    expect(db.timelineEntry.update).not.toHaveBeenCalled();
  });

  it("enregistre le nouvel ordre en une seule transaction", async () => {
    db.timelineEntry.findMany.mockResolvedValue([
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ]);
    await moveTimelineEntry("b", "up");
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.timelineEntry.update).toHaveBeenCalledWith({
      where: { id: "b" },
      data: { position: 0 },
    });
  });
});

describe("réglages du site", () => {
  it("ne met à jour que les champs du formulaire envoyé", async () => {
    await updateSiteSettings({ seoTitle: "Titre", seoDescription: "Desc" });
    expect(db.siteSettings.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { seoTitle: "Titre", seoDescription: "Desc" },
    });
  });

  it("explique l'absence de la ligne de réglages", async () => {
    db.siteSettings.update.mockRejectedValue(prismaError("P2025"));
    await expect(
      updateSiteSettings({ seoTitle: "T", seoDescription: "D" }),
    ).rejects.toThrow(/seed initial/);
  });
});
