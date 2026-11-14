import type { Prisma } from "@/generated/prisma/client";
import type { ContentStatusValue } from "@/features/projects/schemas";

/** Seules les versions publiées sont exposées publiquement. */
export const publicVersionWhere = {
  status: "PUBLISHED",
} satisfies Prisma.ProjectVersionWhereInput;

/**
 * Un projet n'est visible que s'il est publié ET possède au moins une version
 * publiée : un projet publié sans version visible reste masqué.
 */
export const publicProjectWhere = {
  status: "PUBLISHED",
  versions: { some: publicVersionWhere },
} satisfies Prisma.ProjectWhereInput;

export type StatusDates = {
  publishedAt: Date | null;
  archivedAt: Date | null;
};

/**
 * Dates de publication après un changement de statut (ARCHITECTURE §7) :
 * publishedAt garde la date de première publication ; archivedAt est renseigné
 * à l'archivage et vidé dès que le contenu quitte l'archive.
 */
export function statusDates(
  current: StatusDates & { status: ContentStatusValue },
  next: ContentStatusValue,
  now: Date = new Date(),
): StatusDates {
  const publishedAt =
    next === "PUBLISHED" ? (current.publishedAt ?? now) : current.publishedAt;
  if (next === "ARCHIVED") {
    return {
      publishedAt,
      archivedAt: current.status === "ARCHIVED" ? current.archivedAt : now,
    };
  }
  return { publishedAt, archivedAt: null };
}

export const PUBLICATION_ERRORS = {
  projectWithoutVersion:
    "Publiez d'abord au moins une version : un projet sans version publiée resterait invisible.",
  lastPublishedVersion:
    "C'est la dernière version publiée de ce projet publié : dépubliez ou archivez le projet d'abord.",
  deletePublishedProject:
    "Un projet publié ne peut pas être supprimé : passez-le en brouillon ou archivez-le d'abord.",
} as const;

/** Message d'erreur si le projet ne peut pas prendre ce statut, sinon null. */
export function projectStatusError(
  next: ContentStatusValue,
  publishedVersionCount: number,
): string | null {
  return next === "PUBLISHED" && publishedVersionCount === 0
    ? PUBLICATION_ERRORS.projectWithoutVersion
    : null;
}

/**
 * Retirer (dépublier, archiver ou supprimer) une version publiée est refusé si
 * c'est la dernière d'un projet publié : le projet disparaîtrait sans le dire.
 */
export function versionWithdrawalError(input: {
  versionStatus: ContentStatusValue;
  next: ContentStatusValue | "DELETED";
  projectStatus: ContentStatusValue;
  publishedVersionCount: number;
}): string | null {
  const withdrawn =
    input.versionStatus === "PUBLISHED" && input.next !== "PUBLISHED";
  return withdrawn &&
    input.projectStatus === "PUBLISHED" &&
    input.publishedVersionCount <= 1
    ? PUBLICATION_ERRORS.lastPublishedVersion
    : null;
}

/** Suppression d'un projet : refusée tant qu'il est publié. */
export function projectDeletionError(
  status: ContentStatusValue,
): string | null {
  return status === "PUBLISHED"
    ? PUBLICATION_ERRORS.deletePublishedProject
    : null;
}
