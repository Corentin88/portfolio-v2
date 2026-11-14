import { db } from "@/lib/db";
import type { MediaKind } from "@/generated/prisma/enums";
import {
  publicProjectWhere,
  publicVersionWhere,
} from "@/features/projects/publication";
import {
  buildMediaOrderBy,
  buildMediaWhere,
  MEDIA_PAGE_SIZE,
  pageCountFor,
  type FolderRow,
  type MediaQuery,
} from "@/features/media/library";
import type { PublicUsageCounts } from "@/features/media/media-view";

/** Usages détaillés d'un média, pour l'administration et le contrôle de suppression. */
export const mediaUsageSelect = {
  projectCovers: { select: { title: true } },
  projectIcons: { select: { title: true } },
  versionCovers: {
    select: { label: true, project: { select: { title: true } } },
  },
  screenshots: {
    select: {
      version: {
        select: { label: true, project: { select: { title: true } } },
      },
    },
  },
  settingsAsCv: { select: { id: true } },
  settingsAsOgImage: { select: { id: true } },
  settingsAsProfile: { select: { id: true } },
  timelineEntries: { select: { title: true } },
} as const;

const publicVersionOfPublicProject = {
  ...publicVersionWhere,
  project: publicProjectWhere,
};

/** Dossiers virtuels (peu nombreux : chargés en entier), avec leurs compteurs. */
export async function listMediaFolders() {
  return db.mediaFolder.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      parentId: true,
      _count: { select: { media: true, children: true } },
    },
  });
}

export type AdminMediaFolder = Awaited<
  ReturnType<typeof listMediaFolders>
>[number];

export async function countUnclassifiedMedia(): Promise<number> {
  return db.media.count({ where: { folderId: null } });
}

const libraryItemSelect = {
  id: true,
  kind: true,
  storageKey: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  width: true,
  height: true,
  alt: true,
  createdAt: true,
  folderId: true,
  ...mediaUsageSelect,
} as const;

/**
 * Une page de la médiathèque (filtres, tri, pagination côté serveur) : jamais
 * toute la bibliothèque. Une page demandée au-delà de la dernière est ramenée à celle-ci.
 */
export async function searchAdminMedia(
  query: MediaQuery,
  folders: FolderRow[],
) {
  const where = buildMediaWhere(query, folders);
  const total = await db.media.count({ where });
  const pageCount = pageCountFor(total);
  const page = Math.min(query.page, pageCount);
  const items = await db.media.findMany({
    where,
    orderBy: buildMediaOrderBy(query.tri),
    skip: (page - 1) * MEDIA_PAGE_SIZE,
    take: MEDIA_PAGE_SIZE,
    select: libraryItemSelect,
  });
  return { items, total, page, pageCount };
}

export type AdminMedia = Awaited<
  ReturnType<typeof searchAdminMedia>
>["items"][number];

/** Aperçu d'un média déjà choisi (champ du sélecteur). */
export async function getMediaPreview(id: string | null) {
  if (!id) return null;
  return db.media.findUnique({ where: { id }, select: libraryItemSelect });
}

const imagePreviewSelect = {
  id: true,
  storageKey: true,
  width: true,
  height: true,
  alt: true,
} as const;

/** Projets et versions (tous statuts) avec leurs couvertures et galeries. */
export async function listAdminProjectMedia() {
  return db.project.findMany({
    orderBy: { position: "asc" },
    select: {
      id: true,
      title: true,
      status: true,
      coverMedia: { select: imagePreviewSelect },
      versions: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          label: true,
          status: true,
          coverMedia: { select: imagePreviewSelect },
          screenshots: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              alt: true,
              caption: true,
              media: { select: imagePreviewSelect },
            },
          },
        },
      },
    },
  });
}

export type AdminProjectMedia = Awaited<
  ReturnType<typeof listAdminProjectMedia>
>[number];

export type MediaForDelivery = {
  kind: MediaKind;
  storageKey: string;
  mimeType: string;
  originalName: string;
  publicUsages: PublicUsageCounts;
};

/**
 * Média demandé à /media, avec le nombre de ses usages publics. Non mis en cache :
 * une dépublication doit rendre le fichier privé immédiatement.
 */
export async function getMediaForDelivery(
  storageKey: string,
): Promise<MediaForDelivery | null> {
  const media = await db.media.findUnique({
    where: { storageKey },
    select: {
      kind: true,
      storageKey: true,
      mimeType: true,
      originalName: true,
      _count: {
        select: {
          projectCovers: { where: publicProjectWhere },
          projectIcons: { where: publicProjectWhere },
          versionCovers: { where: publicVersionOfPublicProject },
          screenshots: { where: { version: publicVersionOfPublicProject } },
          settingsAsCv: true,
          settingsAsOgImage: true,
          settingsAsProfile: true,
          timelineEntries: { where: { isVisible: true } },
        },
      },
    },
  });
  if (!media) return null;
  const { _count, ...rest } = media;
  return { ...rest, publicUsages: _count };
}

/** PDF désigné comme CV dans les réglages du site. */
export async function getSiteCvForDelivery() {
  const settings = await db.siteSettings.findUnique({
    where: { id: 1 },
    select: { cvMedia: { select: { storageKey: true, kind: true } } },
  });
  const cv = settings?.cvMedia;
  return cv?.kind === "DOCUMENT" ? cv : null;
}

/** Pointeurs CV, image de partage et photo de profil, pour l'administration. */
export async function getAdminSiteMedia() {
  return db.siteSettings.findUnique({
    where: { id: 1 },
    select: {
      cvMedia: {
        select: { id: true, originalName: true, storageKey: true, alt: true },
      },
      ogImageMedia: { select: imagePreviewSelect },
      profilePhotoMedia: { select: imagePreviewSelect },
    },
  });
}

/** Clés connues de la base, pour l'audit disque ↔ base. */
export async function listStorageKeys(): Promise<string[]> {
  const rows = await db.media.findMany({ select: { storageKey: true } });
  return rows.map(({ storageKey }) => storageKey);
}
