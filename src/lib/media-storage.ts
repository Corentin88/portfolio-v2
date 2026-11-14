import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { getMediaRoot } from "@/lib/env";
import { isStoredFileKey, randomFileName } from "@/lib/media-keys";

const TMP_DIR = ".tmp";

/** Chemin absolu d'un fichier, confiné à la racine des médias. */
export function resolveMediaPath(
  key: string,
  root: string = getMediaRoot(),
): string {
  if (!isStoredFileKey(key)) throw new Error("Clé de média invalide.");
  const resolved = path.resolve(root, ...key.split("/"));
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Chemin de média hors de la racine.");
  }
  return resolved;
}

export type MediaFile = { key: string; data: Uint8Array };

/**
 * Écrit les fichiers d'un média : d'abord dans un dossier temporaire de la racine
 * (même volume), puis déplacement atomique. En cas d'échec, rien ne reste en place.
 */
export async function writeMediaFiles(files: MediaFile[]): Promise<void> {
  const root = getMediaRoot();
  const tmpDir = path.join(root, TMP_DIR);
  await mkdir(tmpDir, { recursive: true });

  const written: string[] = [];
  try {
    for (const file of files) {
      const target = resolveMediaPath(file.key, root);
      const tmp = path.join(tmpDir, randomFileName());
      await writeFile(tmp, file.data, { flag: "wx" });
      try {
        await mkdir(path.dirname(target), { recursive: true });
        await rename(tmp, target);
      } catch (error) {
        await rm(tmp, { force: true });
        throw error;
      }
      written.push(file.key);
    }
  } catch (error) {
    await deleteMediaFiles(written);
    throw error;
  }
}

/** Supprime des fichiers ; renvoie les clés qui n'ont pas pu l'être. */
export async function deleteMediaFiles(keys: string[]): Promise<string[]> {
  const root = getMediaRoot();
  const failures: string[] = [];
  for (const key of keys) {
    try {
      await rm(resolveMediaPath(key, root), { force: true });
    } catch {
      failures.push(key);
    }
  }
  return failures;
}

function isMissingFile(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
}

/** Contenu d'un fichier, ou null s'il est absent du disque. */
export async function readMediaFile(key: string): Promise<Buffer | null> {
  try {
    return await readFile(resolveMediaPath(key));
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

/** Fichiers présents sur disque (clés relatives), pour l'audit disque ↔ base. */
export async function listStoredFiles(): Promise<string[]> {
  const root = getMediaRoot();
  const keys: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (isMissingFile(error)) return;
      throw error;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else keys.push(path.relative(root, full).split(path.sep).join("/"));
    }
  }

  await walk(root);
  return keys.sort();
}
