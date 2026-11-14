import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const queries = vi.hoisted(() => ({
  getMediaForDelivery: vi.fn(),
  getSiteCvForDelivery: vi.fn(),
}));
const getCurrentAdmin = vi.hoisted(() => vi.fn());
const readMediaFile = vi.hoisted(() => vi.fn());
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(),
}));
vi.mock("@/features/media/queries", () => queries);
vi.mock("@/features/auth/require-admin", () => ({ getCurrentAdmin }));
vi.mock("@/lib/media-storage", () => ({ readMediaFile }));

import { GET as getCv } from "@/app/cv/route";
import { GET as getMedia } from "@/app/media/[...key]/route";

const KEY = "images/2026/11/0123456789abcdef0123456789abcdef.webp";
const noUsage = {
  projectCovers: 0,
  projectIcons: 0,
  versionCovers: 0,
  screenshots: 0,
  settingsAsCv: 0,
  settingsAsOgImage: 0,
  settingsAsProfile: 0,
  timelineEntries: 0,
};

function requestMedia(key: string) {
  return getMedia(new NextRequest(`http://localhost/media/${key}`), {
    params: Promise.resolve({ key: key.split("/") }),
  });
}

function deliverable(publicUsages = noUsage) {
  return {
    kind: "IMAGE",
    storageKey: KEY,
    mimeType: "image/webp",
    originalName: "photo.png",
    publicUsages,
  };
}

beforeEach(() => {
  queries.getMediaForDelivery.mockReset();
  queries.getSiteCvForDelivery.mockReset();
  getCurrentAdmin.mockReset().mockResolvedValue(null);
  readMediaFile.mockReset().mockResolvedValue(Buffer.from([1, 2, 3]));
});

describe("GET /media/[...key]", () => {
  it("répond 404 à une clé invalide sans interroger la base", async () => {
    const response = await requestMedia("../../.env");
    expect(response.status).toBe(404);
    expect(queries.getMediaForDelivery).not.toHaveBeenCalled();
  });

  it("ne sert pas sans session un média lié seulement à un brouillon", async () => {
    queries.getMediaForDelivery.mockResolvedValue(deliverable());
    const response = await requestMedia(KEY);
    expect(response.status).toBe(404);
    expect(readMediaFile).not.toHaveBeenCalled();
  });

  it("sert ce même média à l'administrateur, sans cache partagé", async () => {
    queries.getMediaForDelivery.mockResolvedValue(deliverable());
    getCurrentAdmin.mockResolvedValue({ id: "admin-1" });
    const response = await requestMedia(KEY);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("sert un média public avec des en-têtes sûrs, miniature comprise", async () => {
    queries.getMediaForDelivery.mockResolvedValue(
      deliverable({ ...noUsage, projectCovers: 1 }),
    );
    const response = await requestMedia(KEY.replace(".webp", ".w960.webp"));
    expect(response.status).toBe(200);
    expect(queries.getMediaForDelivery).toHaveBeenCalledWith(KEY);
    expect(readMediaFile).toHaveBeenCalledWith(
      KEY.replace(".webp", ".w960.webp"),
    );
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toMatch(/^public/);
    expect(getCurrentAdmin).not.toHaveBeenCalled();
  });

  it("répond 404 si le fichier manque sur le disque", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    queries.getMediaForDelivery.mockResolvedValue(
      deliverable({ ...noUsage, screenshots: 1 }),
    );
    readMediaFile.mockResolvedValue(null);
    expect((await requestMedia(KEY)).status).toBe(404);
    warn.mockRestore();
  });
});

describe("GET /cv", () => {
  const cv = {
    storageKey: "documents/0123456789abcdef0123456789abcdef.pdf",
    kind: "DOCUMENT",
  };

  it("répond 404 sans CV défini", async () => {
    queries.getSiteCvForDelivery.mockResolvedValue(null);
    expect((await getCv(new NextRequest("http://localhost/cv"))).status).toBe(
      404,
    );
  });

  it("sert le PDF courant en ligne, ou en téléchargement", async () => {
    queries.getSiteCvForDelivery.mockResolvedValue(cv);

    const inline = await getCv(new NextRequest("http://localhost/cv"));
    expect(inline.status).toBe(200);
    expect(inline.headers.get("content-type")).toBe("application/pdf");
    expect(inline.headers.get("content-disposition")).toMatch(/^inline;/);

    const download = await getCv(
      new NextRequest("http://localhost/cv?download=1"),
    );
    expect(download.headers.get("content-disposition")).toMatch(
      /^attachment; filename="CV-Corentin-Lanaud\.pdf"/,
    );
    expect(readMediaFile).toHaveBeenCalledWith(cv.storageKey);
  });
});
