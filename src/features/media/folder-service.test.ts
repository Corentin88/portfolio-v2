import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const model = () => ({
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  });
  return { mediaFolder: model(), media: model() };
});
vi.mock("@/lib/db", () => ({ db }));

import {
  createFolder,
  deleteFolder,
  moveMediaToFolder,
  renameFolder,
} from "@/features/media/folder-service";
import { DomainError } from "@/lib/errors";

const prismaError = (code: string) => Object.assign(new Error(code), { code });

const tree = [
  { id: "projets", name: "Projets", parentId: null },
  { id: "rss", name: "MonFluxRSS", parentId: "projets" },
  { id: "v2", name: "V2", parentId: "rss" },
];

beforeEach(() => {
  for (const model of Object.values(db)) {
    for (const method of Object.values(model)) method.mockReset();
  }
  db.mediaFolder.findMany.mockResolvedValue(tree);
  db.mediaFolder.findFirst.mockResolvedValue(null);
  db.mediaFolder.create.mockResolvedValue({ id: "new" });
});

describe("createFolder", () => {
  it("crée un dossier racine puis un sous-dossier", async () => {
    await expect(createFolder("Profil", null)).resolves.toBe("new");
    expect(db.mediaFolder.create).toHaveBeenLastCalledWith({
      data: { name: "Profil", parentId: null },
      select: { id: true },
    });
    await createFolder("V1", "rss");
    expect(db.mediaFolder.create).toHaveBeenLastCalledWith({
      data: { name: "V1", parentId: "rss" },
      select: { id: true },
    });
  });

  it("refuse un nom déjà pris entre frères, y compris à la racine", async () => {
    db.mediaFolder.findFirst.mockResolvedValue({ id: "projets" });
    await expect(createFolder("projets", null)).rejects.toThrow(/existe déjà/);
    expect(db.mediaFolder.findFirst).toHaveBeenCalledWith({
      where: { parentId: null, name: "projets" },
      select: { id: true },
    });
    expect(db.mediaFolder.create).not.toHaveBeenCalled();
  });

  it("limite la profondeur à trois niveaux", async () => {
    await expect(createFolder("Trop profond", "v2")).rejects.toThrow(
      /Profondeur maximale/,
    );
    expect(db.mediaFolder.create).not.toHaveBeenCalled();
  });

  it("refuse un parent disparu (contrôle puis clé étrangère)", async () => {
    await expect(createFolder("X", "inconnu")).rejects.toThrow(/n'existe plus/);
    db.mediaFolder.create.mockRejectedValue(prismaError("P2003"));
    await expect(createFolder("X", "rss")).rejects.toThrow(/n'existe plus/);
  });
});

describe("renameFolder", () => {
  it("renomme sans changer le parent (aucun cycle possible)", async () => {
    db.mediaFolder.findUnique.mockResolvedValue({ parentId: "projets" });
    await renameFolder("rss", "Mon flux RSS");
    expect(db.mediaFolder.update).toHaveBeenCalledWith({
      where: { id: "rss" },
      data: { name: "Mon flux RSS" },
    });
  });

  it("refuse le nom d'un frère, en s'excluant soi-même", async () => {
    db.mediaFolder.findUnique.mockResolvedValue({ parentId: null });
    db.mediaFolder.findFirst.mockResolvedValue({ id: "profil" });
    await expect(renameFolder("projets", "Profil")).rejects.toThrow(
      /existe déjà/,
    );
    expect(db.mediaFolder.findFirst).toHaveBeenCalledWith({
      where: { parentId: null, name: "Profil", NOT: { id: "projets" } },
      select: { id: true },
    });
  });
});

describe("deleteFolder", () => {
  const counts = (children: number, media: number) => ({
    _count: { children, media },
  });

  it("refuse un dossier contenant des sous-dossiers ou des médias, sans rien supprimer", async () => {
    db.mediaFolder.findUnique.mockResolvedValue(counts(2, 0));
    await expect(deleteFolder("projets")).rejects.toThrow(
      /2 sous-dossier\(s\)/,
    );
    db.mediaFolder.findUnique.mockResolvedValue(counts(0, 5));
    await expect(deleteFolder("v2")).rejects.toThrow(/5 média\(s\)/);
    expect(db.mediaFolder.delete).not.toHaveBeenCalled();
    expect(db.media.updateMany).not.toHaveBeenCalled();
  });

  it("supprime un dossier vide", async () => {
    db.mediaFolder.findUnique.mockResolvedValue(counts(0, 0));
    await deleteFolder("v2");
    expect(db.mediaFolder.delete).toHaveBeenCalledWith({ where: { id: "v2" } });
  });

  it("annule si du contenu arrive entre le contrôle et la suppression", async () => {
    db.mediaFolder.findUnique.mockResolvedValue(counts(0, 0));
    db.mediaFolder.delete.mockRejectedValue(prismaError("P2003"));
    await expect(deleteFolder("v2")).rejects.toThrow(/vient de recevoir/);
  });
});

describe("moveMediaToFolder", () => {
  it("ne modifie que le dossier : identifiant, fichier et associations intacts", async () => {
    db.mediaFolder.findUnique.mockResolvedValue({ id: "v2" });
    db.media.updateMany.mockResolvedValue({ count: 2 });
    await expect(moveMediaToFolder(["m1", "m2"], "v2")).resolves.toBe(2);
    expect(db.media.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["m1", "m2"] } },
      data: { folderId: "v2" },
    });
  });

  it("range dans « Non classés » sans contrôle de dossier", async () => {
    db.media.updateMany.mockResolvedValue({ count: 1 });
    await moveMediaToFolder(["m1"], null);
    expect(db.mediaFolder.findUnique).not.toHaveBeenCalled();
    expect(db.media.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["m1"] } },
      data: { folderId: null },
    });
  });

  it("refuse un dossier disparu (contrôle et clé étrangère)", async () => {
    db.mediaFolder.findUnique.mockResolvedValue(null);
    await expect(moveMediaToFolder(["m1"], "x")).rejects.toBeInstanceOf(
      DomainError,
    );
    db.mediaFolder.findUnique.mockResolvedValue({ id: "x" });
    db.media.updateMany.mockRejectedValue(prismaError("P2003"));
    await expect(moveMediaToFolder(["m1"], "x")).rejects.toThrow(
      /n'existe plus/,
    );
  });
});
