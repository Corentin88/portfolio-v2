import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const model = () => ({
    aggregate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  });
  return {
    media: model(),
    project: model(),
    projectVersion: model(),
    versionScreenshot: model(),
    siteSettings: model(),
    mediaFolder: model(),
    $transaction: vi.fn(),
  };
});
const storage = vi.hoisted(() => ({
  writeMediaFiles: vi.fn(),
  deleteMediaFiles: vi.fn(),
  listStoredFiles: vi.fn(),
}));
const processImage = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/media-storage", () => storage);
vi.mock("@/features/media/image-processing", () => ({ processImage }));

import {
  addVersionScreenshot,
  addVersionScreenshots,
  setProjectCover,
  setSiteMedia,
} from "@/features/media/link-service";
import {
  auditMediaStorage,
  deleteMedia,
  updateMediaAlt,
  uploadMedia,
} from "@/features/media/service";
import { DomainError } from "@/lib/errors";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PDF = new TextEncoder().encode("%PDF-1.7\n");
const KEY = "images/2026/11/0123456789abcdef0123456789abcdef.webp";
const THUMB = "images/2026/11/0123456789abcdef0123456789abcdef.w960.webp";

const file = (name: string, data: Uint8Array) => new File([data.slice()], name);
const prismaError = (code: string) => Object.assign(new Error(code), { code });
const noUsages = {
  projectCovers: [],
  projectIcons: [],
  versionCovers: [],
  screenshots: [],
  settingsAsCv: [],
  settingsAsOgImage: [],
  settingsAsProfile: [],
  timelineEntries: [],
};

beforeEach(() => {
  for (const value of Object.values(db)) {
    if (typeof value === "function") value.mockReset();
    else for (const method of Object.values(value)) method.mockReset();
  }
  // Transaction interactive : le callback reçoit le client simulé.
  db.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === "function" ? arg(db) : arg,
  );
  db.media.findFirst.mockResolvedValue(null);
  db.media.create.mockResolvedValue({ id: "media-1" });
  for (const fn of Object.values(storage)) fn.mockReset();
  storage.deleteMediaFiles.mockResolvedValue([]);
  processImage.mockReset().mockResolvedValue({
    original: { data: Buffer.from([1]), width: 1200, height: 800 },
    thumbnail: { data: Buffer.from([2]), width: 960, height: 640 },
  });
});

describe("uploadMedia", () => {
  it("refuse un fichier absent ou invalide sans rien écrire", async () => {
    await expect(
      uploadMedia(null, { alt: "", useAsCv: false, folderId: null }),
    ).rejects.toThrow(DomainError);
    await expect(
      uploadMedia(file("logo.svg", PNG), {
        alt: "Logo",
        useAsCv: false,
        folderId: null,
      }),
    ).rejects.toThrow(/SVG/);
    expect(storage.writeMediaFiles).not.toHaveBeenCalled();
    expect(db.media.create).not.toHaveBeenCalled();
  });

  it("exige un texte alternatif pour une image", async () => {
    await expect(
      uploadMedia(file("photo.png", PNG), {
        alt: "",
        useAsCv: false,
        folderId: null,
      }),
    ).rejects.toThrow(/texte alternatif/i);
    expect(processImage).not.toHaveBeenCalled();
  });

  it("refuse un doublon (même empreinte SHA-256)", async () => {
    db.media.findFirst.mockResolvedValue({ originalName: "ancien.png" });
    await expect(
      uploadMedia(file("photo.png", PNG), {
        alt: "Photo",
        useAsCv: false,
        folderId: null,
      }),
    ).rejects.toThrow(/ancien\.png/);
    expect(storage.writeMediaFiles).not.toHaveBeenCalled();
  });

  it("refuse une image illisible", async () => {
    processImage.mockRejectedValue(new Error("Input buffer is corrupt"));
    await expect(
      uploadMedia(file("photo.png", PNG), {
        alt: "Photo",
        useAsCv: false,
        folderId: null,
      }),
    ).rejects.toThrow("Image illisible ou corrompue.");
  });

  it("écrit l'image et sa miniature puis la ligne Media, sans nom d'origine dans la clé", async () => {
    await uploadMedia(file("../Mon Écran.png", PNG), {
      alt: "Écran d'accueil",
      useAsCv: false,
      folderId: null,
    });

    const [files] = storage.writeMediaFiles.mock.calls[0]!;
    const keys = files.map((f: { key: string }) => f.key);
    expect(keys[0]).toMatch(/^images\/\d{4}\/\d{2}\/[a-f0-9]{32}\.webp$/);
    expect(keys[1]).toMatch(/\.w960\.webp$/);

    const [{ data }] = db.media.create.mock.calls[0]!;
    expect(data).toMatchObject({
      kind: "IMAGE",
      storageKey: keys[0],
      originalName: "Mon Écran.png",
      mimeType: "image/webp",
      width: 1200,
      height: 800,
      alt: "Écran d'accueil",
      checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(db.siteSettings.update).not.toHaveBeenCalled();
  });

  it("supprime les fichiers écrits si l'insertion en base échoue", async () => {
    db.media.create.mockRejectedValue(new Error("base indisponible"));
    await expect(
      uploadMedia(file("cv.pdf", PDF), {
        alt: "",
        useAsCv: false,
        folderId: null,
      }),
    ).rejects.toThrow("base indisponible");

    const [files] = storage.writeMediaFiles.mock.calls[0]!;
    expect(storage.deleteMediaFiles).toHaveBeenCalledWith([files[0].key]);
  });

  it("définit le PDF comme CV dans la même transaction", async () => {
    await uploadMedia(file("cv.pdf", PDF), {
      alt: "",
      useAsCv: true,
      folderId: null,
    });
    expect(db.siteSettings.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { cvMediaId: "media-1" },
    });
  });

  it("refuse une image comme CV", async () => {
    await expect(
      uploadMedia(file("photo.png", PNG), {
        alt: "Photo",
        useAsCv: true,
        folderId: null,
      }),
    ).rejects.toThrow(/PDF/);
  });
});

describe("updateMediaAlt", () => {
  it("refuse de vider le texte alternatif d'une image", async () => {
    db.media.findUnique.mockResolvedValue({ kind: "IMAGE" });
    await expect(updateMediaAlt("m1", "")).rejects.toThrow(/obligatoire/);
    expect(db.media.update).not.toHaveBeenCalled();
  });

  it("l'accepte pour un PDF", async () => {
    db.media.findUnique.mockResolvedValue({ kind: "DOCUMENT" });
    await updateMediaAlt("m1", "");
    expect(db.media.update).toHaveBeenCalled();
  });
});

describe("deleteMedia", () => {
  it("est refusée tant que le média est utilisé, en indiquant où", async () => {
    db.media.findUnique.mockResolvedValue({
      storageKey: KEY,
      ...noUsages,
      projectCovers: [{ title: "Météo" }],
      settingsAsOgImage: [{ id: 1 }],
    });
    await expect(deleteMedia("m1")).rejects.toThrow(
      /couverture du projet « Météo » ; image de partage/,
    );
    expect(db.media.delete).not.toHaveBeenCalled();
    expect(storage.deleteMediaFiles).not.toHaveBeenCalled();
  });

  it("supprime la ligne puis les fichiers (image + miniature)", async () => {
    db.media.findUnique.mockResolvedValue({ storageKey: KEY, ...noUsages });
    await deleteMedia("m1");
    expect(db.media.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
    expect(storage.deleteMediaFiles).toHaveBeenCalledWith([KEY, THUMB]);
  });

  it("garde les fichiers si la base refuse (usage apparu entre-temps, Restrict)", async () => {
    db.media.findUnique.mockResolvedValue({ storageKey: KEY, ...noUsages });
    db.media.delete.mockRejectedValue(prismaError("P2003"));
    await expect(deleteMedia("m1")).rejects.toThrow(/utilisé ailleurs/);
    expect(storage.deleteMediaFiles).not.toHaveBeenCalled();
  });

  it("journalise un fichier impossible à effacer sans échouer", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    db.media.findUnique.mockResolvedValue({ storageKey: KEY, ...noUsages });
    storage.deleteMediaFiles.mockResolvedValue([THUMB]);
    await deleteMedia("m1");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(THUMB));
    warn.mockRestore();
  });
});

describe("auditMediaStorage", () => {
  it("signale les fichiers manquants et orphelins", async () => {
    db.media.findMany.mockResolvedValue([{ storageKey: KEY }]);
    storage.listStoredFiles.mockResolvedValue([
      KEY,
      "documents/ffffffffffffffffffffffffffffffff.pdf",
    ]);
    await expect(auditMediaStorage()).resolves.toEqual({
      missingFiles: [THUMB],
      orphanFiles: ["documents/ffffffffffffffffffffffffffffffff.pdf"],
    });
  });
});

describe("import dans un dossier", () => {
  it("range le nouveau média dans le dossier choisi et renvoie son identifiant", async () => {
    db.mediaFolder.findUnique.mockResolvedValue({ id: "v2" });
    await expect(
      uploadMedia(file("capture.png", PNG), {
        alt: "Capture",
        useAsCv: false,
        folderId: "v2",
      }),
    ).resolves.toEqual({ id: "media-1", kind: "IMAGE" });
    const [{ data }] = db.media.create.mock.calls[0]!;
    expect(data.folderId).toBe("v2");
    // Le dossier est logique : la clé de stockage ne le contient pas.
    expect(data.storageKey).toMatch(
      /^images\/\d{4}\/\d{2}\/[a-f0-9]{32}\.webp$/,
    );
  });

  it("refuse un dossier disparu avant toute écriture de fichier", async () => {
    db.mediaFolder.findUnique.mockResolvedValue(null);
    await expect(
      uploadMedia(file("capture.png", PNG), {
        alt: "Capture",
        useAsCv: false,
        folderId: "disparu",
      }),
    ).rejects.toThrow(/dossier n'existe plus/);
    expect(storage.writeMediaFiles).not.toHaveBeenCalled();
    expect(db.media.create).not.toHaveBeenCalled();
  });

  it("garde les contrôles existants (SVG refusé) même dans un dossier", async () => {
    db.mediaFolder.findUnique.mockResolvedValue({ id: "v2" });
    await expect(
      uploadMedia(file("logo.svg", PNG), {
        alt: "Logo",
        useAsCv: false,
        folderId: "v2",
      }),
    ).rejects.toBeInstanceOf(DomainError);
    expect(storage.writeMediaFiles).not.toHaveBeenCalled();
  });
});

describe("ajout multiple à une galerie", () => {
  it("ajoute en fin de galerie dans l'ordre choisi, sans doublon ni changement de l'existant", async () => {
    db.media.findMany.mockResolvedValue([
      { id: "a", kind: "IMAGE" },
      { id: "b", kind: "IMAGE" },
      { id: "c", kind: "IMAGE" },
    ]);
    db.versionScreenshot.findMany.mockResolvedValue([
      { mediaId: "b", position: 0 },
      { mediaId: "z", position: 3 },
    ]);
    await expect(addVersionScreenshots("v1", ["c", "b", "a"])).resolves.toEqual(
      { added: 2, skipped: 1 },
    );
    expect(
      db.versionScreenshot.create.mock.calls.map(([arg]) => arg.data),
    ).toEqual([
      { versionId: "v1", mediaId: "c", position: 4 },
      { versionId: "v1", mediaId: "a", position: 5 },
    ]);
    expect(db.versionScreenshot.update).not.toHaveBeenCalled();
  });

  it("refuse un PDF ou un média disparu, sans rien ajouter", async () => {
    db.media.findMany.mockResolvedValue([{ id: "cv", kind: "DOCUMENT" }]);
    await expect(addVersionScreenshots("v1", ["cv"])).rejects.toThrow(
      /Seules des images/,
    );
    await expect(addVersionScreenshots("v1", ["absent"])).rejects.toThrow(
      /n'existe plus/,
    );
    expect(db.versionScreenshot.create).not.toHaveBeenCalled();
  });
});

describe("associations", () => {
  it("refuse un PDF comme couverture et une image comme CV", async () => {
    db.media.findUnique.mockResolvedValue({ kind: "DOCUMENT" });
    await expect(setProjectCover("p1", "m1")).rejects.toThrow(/une image/);
    db.media.findUnique.mockResolvedValue({ kind: "IMAGE" });
    await expect(setSiteMedia("cv", "m1")).rejects.toThrow(/un PDF/);
    expect(db.project.update).not.toHaveBeenCalled();
    expect(db.siteSettings.update).not.toHaveBeenCalled();
  });

  it("définit puis retire la photo de profil", async () => {
    db.media.findUnique.mockResolvedValue({ kind: "IMAGE" });
    await setSiteMedia("profilePhoto", "m1");
    expect(db.siteSettings.update).toHaveBeenLastCalledWith({
      where: { id: 1 },
      data: { profilePhotoMediaId: "m1" },
    });
    await setSiteMedia("profilePhoto", null);
    expect(db.siteSettings.update).toHaveBeenLastCalledWith({
      where: { id: 1 },
      data: { profilePhotoMediaId: null },
    });
  });

  it("refuse un PDF comme photo de profil", async () => {
    db.media.findUnique.mockResolvedValue({ kind: "DOCUMENT" });
    await expect(setSiteMedia("profilePhoto", "m1")).rejects.toThrow(
      /une image/,
    );
    expect(db.siteSettings.update).not.toHaveBeenCalled();
  });

  it("retire une couverture sans contrôle de média", async () => {
    await setProjectCover("p1", null);
    expect(db.media.findUnique).not.toHaveBeenCalled();
    expect(db.project.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { coverMediaId: null },
    });
  });

  it("ajoute une capture en fin de galerie et refuse un doublon", async () => {
    db.media.findUnique.mockResolvedValue({ kind: "IMAGE" });
    db.versionScreenshot.aggregate.mockResolvedValue({ _max: { position: 2 } });
    await addVersionScreenshot("v1", "m1", { alt: null, caption: null });
    expect(db.versionScreenshot.create).toHaveBeenCalledWith({
      data: {
        versionId: "v1",
        mediaId: "m1",
        alt: null,
        caption: null,
        position: 3,
      },
    });

    db.versionScreenshot.create.mockRejectedValue(prismaError("P2002"));
    await expect(
      addVersionScreenshot("v1", "m1", { alt: null, caption: null }),
    ).rejects.toThrow(/déjà dans la galerie/);
  });
});
