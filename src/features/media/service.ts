import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { DomainError, withDomainErrors } from "@/lib/errors";
import {
  newDocumentKey,
  newImageKey,
  storedKeysFor,
  thumbnailKey,
} from "@/lib/media-keys";
import {
  deleteMediaFiles,
  listStoredFiles,
  writeMediaFiles,
  type MediaFile,
} from "@/lib/media-storage";
import {
  checkUploadedFile,
  MAX_UPLOAD_BYTES,
  sanitizeOriginalName,
} from "@/features/media/file-validation";
import { assertFolderExists } from "@/features/media/folder-service";
import { processImage } from "@/features/media/image-processing";
import { describeUsages } from "@/features/media/media-view";
import { listStorageKeys, mediaUsageSelect } from "@/features/media/queries";
import type { UploadMediaInput } from "@/features/media/schemas";

const NOT_FOUND = "Ce média n'existe plus. Rechargez la page.";

type PreparedMedia = {
  files: MediaFile[];
  data: {
    kind: "IMAGE" | "DOCUMENT";
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
  };
};

async function prepareImage(bytes: Uint8Array): Promise<PreparedMedia> {
  let processed;
  try {
    processed = await processImage(bytes);
  } catch {
    throw new DomainError("Image illisible ou corrompue.");
  }
  const storageKey = newImageKey();
  const { original, thumbnail } = processed;
  return {
    files: [
      { key: storageKey, data: original.data },
      { key: thumbnailKey(storageKey), data: thumbnail.data },
    ],
    data: {
      kind: "IMAGE",
      storageKey,
      mimeType: "image/webp",
      sizeBytes: original.data.length,
      width: original.width,
      height: original.height,
    },
  };
}

function prepareDocument(bytes: Uint8Array): PreparedMedia {
  const storageKey = newDocumentKey();
  return {
    files: [{ key: storageKey, data: bytes }],
    data: {
      kind: "DOCUMENT",
      storageKey,
      mimeType: "application/pdf",
      sizeBytes: bytes.length,
      width: null,
      height: null,
    },
  };
}

function logWarning(message: string, details: Record<string, unknown>): void {
  console.warn(JSON.stringify({ level: "warn", message, ...details }));
}

/**
 * Upload : contrôles (taille, signature, extension, décodage) → écriture des
 * fichiers → ligne Media. Si l'insertion échoue, les fichiers écrits sont retirés.
 */
export async function uploadMedia(
  file: File | null,
  input: UploadMediaInput,
): Promise<{ id: string; kind: "IMAGE" | "DOCUMENT" }> {
  if (!file || file.size === 0) throw new DomainError("Choisissez un fichier.");
  // Refus avant toute lecture du contenu.
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new DomainError("Fichier trop volumineux.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkUploadedFile({ name: file.name, bytes });
  if (!check.ok) throw new DomainError(check.error);

  if (check.kind === "IMAGE" && !input.alt) {
    throw new DomainError(
      "Le texte alternatif est obligatoire pour une image (accessibilité).",
    );
  }
  if (input.useAsCv && check.kind !== "DOCUMENT") {
    throw new DomainError("Seul un PDF peut servir de CV.");
  }

  await assertFolderExists(input.folderId);

  const checksum = createHash("sha256").update(bytes).digest("hex");
  const duplicate = await db.media.findFirst({
    where: { checksum },
    select: { originalName: true },
  });
  if (duplicate) {
    throw new DomainError(
      `Ce fichier est déjà dans la bibliothèque (« ${duplicate.originalName} »).`,
    );
  }

  const prepared =
    check.kind === "IMAGE" ? await prepareImage(bytes) : prepareDocument(bytes);

  await writeMediaFiles(prepared.files);
  try {
    const id = await db.$transaction(async (tx) => {
      const media = await tx.media.create({
        data: {
          ...prepared.data,
          originalName: sanitizeOriginalName(file.name),
          alt: input.alt,
          checksum,
          folderId: input.folderId,
        },
        select: { id: true },
      });
      if (input.useAsCv) {
        await tx.siteSettings.update({
          where: { id: 1 },
          data: { cvMediaId: media.id },
        });
      }
      return media.id;
    });
    return { id, kind: check.kind };
  } catch (error) {
    const failures = await deleteMediaFiles(prepared.files.map((f) => f.key));
    if (failures.length > 0) {
      logWarning("media.rollback_failed", { keys: failures });
    }
    throw error;
  }
}

export async function updateMediaAlt(id: string, alt: string): Promise<void> {
  const media = await db.media.findUnique({
    where: { id },
    select: { kind: true },
  });
  if (!media) throw new DomainError(NOT_FOUND);
  if (media.kind === "IMAGE" && !alt) {
    throw new DomainError(
      "Le texte alternatif est obligatoire pour une image (accessibilité).",
    );
  }
  await withDomainErrors(db.media.update({ where: { id }, data: { alt } }), {
    notFound: NOT_FOUND,
  });
}

/**
 * Suppression d'un média non utilisé : la ligne d'abord (les clés étrangères en
 * Restrict la refusent si un usage apparaît entre-temps), puis les fichiers.
 * Un fichier impossible à effacer est journalisé et retrouvé par l'audit.
 */
export async function deleteMedia(id: string): Promise<void> {
  const media = await db.media.findUnique({
    where: { id },
    select: { storageKey: true, ...mediaUsageSelect },
  });
  if (!media) throw new DomainError(NOT_FOUND);

  const usages = describeUsages(media);
  if (usages.length > 0) {
    throw new DomainError(
      `Média utilisé : ${usages.join(" ; ")}. Retirez-le d'abord de ces contenus.`,
    );
  }

  await withDomainErrors(db.media.delete({ where: { id } }), {
    notFound: NOT_FOUND,
    inUse: "Ce média vient d'être utilisé ailleurs : suppression annulée.",
  });

  const failures = await deleteMediaFiles(storedKeysFor(media.storageKey));
  if (failures.length > 0) {
    logWarning("media.file_delete_failed", { keys: failures });
  }
}

export type MediaAudit = {
  /** Lignes Media dont un fichier manque sur le disque (référence cassée). */
  missingFiles: string[];
  /** Fichiers sans ligne Media (orphelins, à supprimer après vérification). */
  orphanFiles: string[];
};

/** Comparaison disque ↔ base, en lecture seule. */
export async function auditMediaStorage(): Promise<MediaAudit> {
  const [storageKeys, files] = await Promise.all([
    listStorageKeys(),
    listStoredFiles(),
  ]);
  const expected = new Set(storageKeys.flatMap(storedKeysFor));
  const present = new Set(files);
  return {
    missingFiles: [...expected].filter((key) => !present.has(key)).sort(),
    orphanFiles: files.filter((key) => !expected.has(key)),
  };
}
