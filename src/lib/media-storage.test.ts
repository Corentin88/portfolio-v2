import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  deleteMediaFiles,
  listStoredFiles,
  readMediaFile,
  resolveMediaPath,
  writeMediaFiles,
} from "@/lib/media-storage";

const NAME = "0123456789abcdef0123456789abcdef";
const IMAGE = `images/2026/11/${NAME}.webp`;
const THUMB = `images/2026/11/${NAME}.w960.webp`;
let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "portfolio-media-"));
  process.env.MEDIA_ROOT = root;
});

afterEach(async () => {
  delete process.env.MEDIA_ROOT;
  await rm(root, { recursive: true, force: true });
});

describe("stockage des médias", () => {
  it("confine les chemins à la racine", () => {
    expect(resolveMediaPath(IMAGE, root)).toBe(
      path.join(root, "images", "2026", "11", `${NAME}.webp`),
    );
    expect(() => resolveMediaPath("../secret.webp", root)).toThrow();
    expect(() => resolveMediaPath("images/../../x", root)).toThrow();
  });

  it("écrit, relit, liste et supprime sans laisser de temporaire", async () => {
    await writeMediaFiles([
      { key: IMAGE, data: new Uint8Array([1, 2, 3]) },
      { key: THUMB, data: new Uint8Array([4]) },
    ]);
    const content = await readMediaFile(IMAGE);
    expect(content && [...content]).toEqual([1, 2, 3]);
    expect(await listStoredFiles()).toEqual([IMAGE, THUMB].sort());
    expect(await readdir(path.join(root, ".tmp"))).toEqual([]);

    expect(await deleteMediaFiles([IMAGE, THUMB])).toEqual([]);
    expect(await readMediaFile(IMAGE)).toBeNull();
  });

  it("ne laisse aucun fichier si une écriture échoue", async () => {
    await expect(
      writeMediaFiles([
        { key: IMAGE, data: new Uint8Array([1]) },
        { key: "../evasion.webp", data: new Uint8Array([2]) },
      ]),
    ).rejects.toThrow();
    expect(await listStoredFiles()).toEqual([]);
  });
});
