import { beforeEach, describe, expect, it, vi } from "vitest";

const project = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { project } }));
// Hors de Next, les fonctions de cache n'ont pas de contexte : neutralisées.
vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

import { getPublicProjectCatalog } from "@/features/projects/queries";

beforeEach(() => project.findMany.mockReset());

describe("getPublicProjectCatalog", () => {
  it("ne demande que les projets publiés ayant une version publiée", async () => {
    project.findMany.mockResolvedValue([]);
    await getPublicProjectCatalog();

    const [args] = project.findMany.mock.calls[0]!;
    expect(args.where).toEqual({
      status: "PUBLISHED",
      versions: { some: { status: "PUBLISHED" } },
    });
    expect(args.select.versions.where).toEqual({ status: "PUBLISHED" });
  });

  it("renvoie un catalogue vide sans projet publié", async () => {
    project.findMany.mockResolvedValue([]);
    await expect(getPublicProjectCatalog()).resolves.toEqual({
      projects: [],
      categories: [],
    });
  });

  it("n'expose aucun champ d'administration", async () => {
    project.findMany.mockResolvedValue([]);
    await getPublicProjectCatalog();

    const [args] = project.findMany.mock.calls[0]!;
    for (const field of ["status", "publishedAt", "archivedAt", "seoTitle"]) {
      expect(args.select).not.toHaveProperty(field);
    }
  });
});
