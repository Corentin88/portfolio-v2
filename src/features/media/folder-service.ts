import { db } from "@/lib/db";
import { DomainError, withDomainErrors } from "@/lib/errors";
import { folderPath, MAX_FOLDER_DEPTH } from "@/features/media/library";

// Dossiers virtuels : seule la base change. Les fichiers, leurs URL et les
// associations des médias ne sont jamais touchés.

const FOLDER_NOT_FOUND = "Ce dossier n'existe plus. Rechargez la page.";
const DUPLICATE_NAME = "Un dossier de ce nom existe déjà à cet emplacement.";

async function listFolderRows() {
  return db.mediaFolder.findMany({
    select: { id: true, name: true, parentId: true },
  });
}

/**
 * Nom unique entre frères. La contrainte unique de la base ne couvre pas la
 * racine (parentId NULL) ; la collation _ci rend la comparaison insensible à la casse.
 */
async function assertNameAvailable(
  parentId: string | null,
  name: string,
  exceptId?: string,
): Promise<void> {
  const existing = await db.mediaFolder.findFirst({
    where: { parentId, name, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  if (existing) throw new DomainError(DUPLICATE_NAME);
}

export async function createFolder(
  name: string,
  parentId: string | null,
): Promise<string> {
  if (parentId) {
    const folders = await listFolderRows();
    const path = folderPath(folders, parentId);
    if (path.length === 0) throw new DomainError(FOLDER_NOT_FOUND);
    if (path.length >= MAX_FOLDER_DEPTH) {
      throw new DomainError(
        `Profondeur maximale atteinte (${MAX_FOLDER_DEPTH} niveaux) : créez ce dossier plus haut.`,
      );
    }
  }
  await assertNameAvailable(parentId, name);
  const folder = await withDomainErrors(
    db.mediaFolder.create({
      data: { name, parentId },
      select: { id: true },
    }),
    {
      notFound: FOLDER_NOT_FOUND,
      duplicate: DUPLICATE_NAME,
      // Parent supprimé entre-temps.
      inUse: FOLDER_NOT_FOUND,
    },
  );
  return folder.id;
}

/** Renommer ne change pas le parent : aucun cycle ne peut apparaître. */
export async function renameFolder(id: string, name: string): Promise<void> {
  const folder = await db.mediaFolder.findUnique({
    where: { id },
    select: { parentId: true },
  });
  if (!folder) throw new DomainError(FOLDER_NOT_FOUND);
  await assertNameAvailable(folder.parentId, name, id);
  await withDomainErrors(
    db.mediaFolder.update({ where: { id }, data: { name } }),
    { notFound: FOLDER_NOT_FOUND, duplicate: DUPLICATE_NAME },
  );
}

/**
 * Suppression d'un dossier vide uniquement : jamais de suppression en cascade
 * des sous-dossiers ni des médias. Les clés étrangères en Restrict refusent
 * aussi un contenu apparu entre le contrôle et la suppression.
 */
export async function deleteFolder(id: string): Promise<void> {
  const folder = await db.mediaFolder.findUnique({
    where: { id },
    select: { _count: { select: { children: true, media: true } } },
  });
  if (!folder) throw new DomainError(FOLDER_NOT_FOUND);
  const { children, media } = folder._count;
  if (children > 0 || media > 0) {
    const parts = [
      children > 0 ? `${children} sous-dossier(s)` : null,
      media > 0 ? `${media} média(s)` : null,
    ].filter(Boolean);
    throw new DomainError(
      `Dossier non vide (${parts.join(" et ")}) : déplacez ou supprimez d'abord son contenu. Aucun fichier n'est supprimé avec un dossier.`,
    );
  }
  await withDomainErrors(db.mediaFolder.delete({ where: { id } }), {
    notFound: FOLDER_NOT_FOUND,
    inUse: "Le dossier vient de recevoir du contenu : suppression annulée.",
  });
}

/** Vérifie qu'un dossier de destination existe (null = « Non classés »). */
export async function assertFolderExists(
  folderId: string | null,
): Promise<void> {
  if (!folderId) return;
  const folder = await db.mediaFolder.findUnique({
    where: { id: folderId },
    select: { id: true },
  });
  if (!folder) throw new DomainError(FOLDER_NOT_FOUND);
}

/**
 * Range des médias dans un dossier : seule la colonne folderId change
 * (identifiant, fichier, URL et associations intacts). Renvoie le nombre déplacé.
 */
export async function moveMediaToFolder(
  mediaIds: string[],
  folderId: string | null,
): Promise<number> {
  await assertFolderExists(folderId);
  const { count } = await withDomainErrors(
    db.media.updateMany({
      where: { id: { in: mediaIds } },
      data: { folderId },
    }),
    { notFound: FOLDER_NOT_FOUND, inUse: FOLDER_NOT_FOUND },
  );
  return count;
}
