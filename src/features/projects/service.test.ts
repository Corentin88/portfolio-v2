import { beforeEach, describe, expect, it, vi } from "vitest";

// Base simulée ; $transaction(fn) exécute fn avec la même base (client de transaction).
const db = vi.hoisted(() => {
  const model = () => ({
    aggregate: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  });
  const client = {
    project: model(),
    projectCategory: model(),
    projectVersion: model(),
    technology: model(),
    versionTechnology: model(),
    versionHighlight: model(),
    versionChallenge: model(),
    media: model(),
    $transaction: vi.fn(),
  };
  return client;
});
vi.mock("@/lib/db", () => ({ db }));

import {
  createProject,
  deleteProject,
  updateProject,
} from "@/features/projects/service";
import {
  deleteVersion,
  updateVersion,
} from "@/features/projects/version-service";
import { PUBLICATION_ERRORS } from "@/features/projects/publication";
import { DomainError } from "@/lib/errors";

const prismaError = (code: string) => Object.assign(new Error(code), { code });

beforeEach(() => {
  for (const value of Object.values(db)) {
    if (typeof value === "function") value.mockReset();
    else for (const method of Object.values(value)) method.mockReset();
  }
  db.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === "function" ? arg(db) : Promise.all(arg as unknown[]),
  );
  db.projectCategory.findUnique.mockResolvedValue({ id: "cat1" });
});

const projectInput = {
  title: "Météo App",
  slug: "",
  summary: "Prévisions.",
  context: null,
  badgeLabel: null,
  badgeTone: "warning" as const,
  iconKey: "cloud-sun" as const,
  iconMediaId: null,
  featured: false,
  categoryId: "cat1",
  seoTitle: null,
  seoDescription: null,
};

describe("createProject", () => {
  it("crée un brouillon en fin de liste, slug dérivé du titre", async () => {
    db.project.aggregate.mockResolvedValue({ _max: { position: 4 } });
    db.project.create.mockResolvedValue({ id: "p1" });
    await expect(createProject(projectInput)).resolves.toBe("p1");
    expect(db.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "meteo-app",
          status: "DRAFT",
          position: 5,
        }),
      }),
    );
  });

  it("traduit un slug déjà pris en message lisible", async () => {
    db.project.aggregate.mockResolvedValue({ _max: { position: null } });
    db.project.create.mockRejectedValue(prismaError("P2002"));
    await expect(createProject(projectInput)).rejects.toThrow(/slug/);
  });

  it("enregistre la couleur du badge et le logo importé", async () => {
    db.project.aggregate.mockResolvedValue({ _max: { position: null } });
    db.project.create.mockResolvedValue({ id: "p1" });
    db.media.findUnique.mockResolvedValue({ kind: "IMAGE" });
    await createProject({
      ...projectInput,
      badgeLabel: "En ligne",
      badgeTone: "success",
      iconMediaId: "logo1",
    });
    expect(db.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          badgeTone: "success",
          iconMediaId: "logo1",
        }),
      }),
    );
  });

  it("refuse un PDF comme logo de projet", async () => {
    db.media.findUnique.mockResolvedValue({ kind: "DOCUMENT" });
    await expect(
      createProject({ ...projectInput, iconMediaId: "doc1" }),
    ).rejects.toThrow(/une image/);
    expect(db.project.create).not.toHaveBeenCalled();
  });

  it("refuse une catégorie disparue", async () => {
    db.projectCategory.findUnique.mockResolvedValue(null);
    await expect(createProject(projectInput)).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(db.project.create).not.toHaveBeenCalled();
  });
});

describe("updateProject", () => {
  const current = (publishedVersions: number) => ({
    status: "DRAFT",
    publishedAt: null,
    archivedAt: null,
    _count: { versions: publishedVersions },
  });

  it("refuse la publication sans version publiée", async () => {
    db.project.findUnique.mockResolvedValue(current(0));
    await expect(
      updateProject("p1", { ...projectInput, status: "PUBLISHED" }),
    ).rejects.toThrow(PUBLICATION_ERRORS.projectWithoutVersion);
    expect(db.project.update).not.toHaveBeenCalled();
  });

  it("publie et date la première publication", async () => {
    db.project.findUnique.mockResolvedValue(current(1));
    await updateProject("p1", {
      ...projectInput,
      slug: "meteo",
      status: "PUBLISHED",
    });
    const { data } = db.project.update.mock.calls[0]![0];
    expect(data.status).toBe("PUBLISHED");
    expect(data.slug).toBe("meteo");
    expect(data.publishedAt).toBeInstanceOf(Date);
    expect(data.archivedAt).toBeNull();
  });
});

describe("deleteProject", () => {
  it("refuse de supprimer un projet publié", async () => {
    db.project.findUnique.mockResolvedValue({
      title: "X",
      status: "PUBLISHED",
    });
    await expect(deleteProject("p1")).rejects.toThrow(
      PUBLICATION_ERRORS.deletePublishedProject,
    );
    expect(db.project.delete).not.toHaveBeenCalled();
  });

  it("supprime un brouillon", async () => {
    db.project.findUnique.mockResolvedValue({ title: "X", status: "DRAFT" });
    await expect(deleteProject("p1")).resolves.toBe("X");
    expect(db.project.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});

const versionInput = {
  slug: "v1",
  label: "V1",
  periodLabel: null,
  releasedAt: null,
  description: "Première version.",
  sourceUrl: null,
  demoUrl: null,
  status: "DRAFT" as const,
  technologyIds: ["t1", "t2"],
  features: ["Connexion"],
  improvements: ["Plus rapide"],
};

const publishedVersion = {
  label: "V1",
  status: "PUBLISHED",
  publishedAt: new Date("2025-01-01"),
  archivedAt: null,
  projectId: "p1",
  project: { status: "PUBLISHED" },
};

describe("updateVersion", () => {
  it("refuse de dépublier la dernière version d'un projet publié", async () => {
    db.technology.count.mockResolvedValue(2);
    db.projectVersion.findUnique.mockResolvedValue(publishedVersion);
    db.projectVersion.count.mockResolvedValue(1);
    await expect(updateVersion("v1", versionInput)).rejects.toThrow(
      PUBLICATION_ERRORS.lastPublishedVersion,
    );
    expect(db.projectVersion.update).not.toHaveBeenCalled();
  });

  it("refuse une technologie inconnue", async () => {
    db.technology.count.mockResolvedValue(1);
    await expect(updateVersion("v1", versionInput)).rejects.toThrow(
      /technologie/,
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("remplace technologies et points clés dans l'ordre saisi", async () => {
    db.technology.count.mockResolvedValue(2);
    db.projectVersion.findUnique.mockResolvedValue(publishedVersion);
    db.projectVersion.count.mockResolvedValue(2);
    await updateVersion("v1", versionInput);

    expect(db.versionTechnology.deleteMany).toHaveBeenCalledWith({
      where: { versionId: "v1" },
    });
    expect(db.versionTechnology.createMany).toHaveBeenCalledWith({
      data: [
        { versionId: "v1", technologyId: "t1", position: 0 },
        { versionId: "v1", technologyId: "t2", position: 1 },
      ],
    });
    expect(db.versionHighlight.createMany).toHaveBeenCalledWith({
      data: [
        { kind: "FEATURE", text: "Connexion", position: 0, versionId: "v1" },
        {
          kind: "IMPROVEMENT",
          text: "Plus rapide",
          position: 0,
          versionId: "v1",
        },
      ],
    });
    // Date de première publication conservée lors du passage en brouillon.
    const { data } = db.projectVersion.update.mock.calls[0]![0];
    expect(data.publishedAt).toEqual(publishedVersion.publishedAt);
  });
});

describe("deleteVersion", () => {
  it("refuse de supprimer la dernière version publiée d'un projet publié", async () => {
    db.projectVersion.findUnique.mockResolvedValue(publishedVersion);
    db.projectVersion.count.mockResolvedValue(1);
    await expect(deleteVersion("v1")).rejects.toThrow(
      PUBLICATION_ERRORS.lastPublishedVersion,
    );
    expect(db.projectVersion.delete).not.toHaveBeenCalled();
  });

  it("supprime une version brouillon", async () => {
    db.projectVersion.findUnique.mockResolvedValue({
      ...publishedVersion,
      status: "DRAFT",
    });
    db.projectVersion.count.mockResolvedValue(1);
    await expect(deleteVersion("v1")).resolves.toBe("V1");
    expect(db.projectVersion.delete).toHaveBeenCalledWith({
      where: { id: "v1" },
    });
  });
});
