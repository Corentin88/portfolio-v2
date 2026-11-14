import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

// Règles pures de la médiathèque : arborescence des dossiers virtuels, paramètres
// de navigation (URL de /admin/medias et API du sélecteur) et filtres Prisma.

export const MAX_FOLDER_DEPTH = 3;
export const MEDIA_PAGE_SIZE = 24;
/** Valeur de `dossier` désignant les médias sans dossier. */
export const UNCLASSIFIED = "non-classes";

export type FolderRow = { id: string; name: string; parentId: string | null };

/**
 * Chemin racine → dossier (fil d'Ariane). Vide si le dossier est inconnu.
 * Borné : une donnée corrompue formant un cycle ne fait pas boucler la page.
 */
export function folderPath(folders: FolderRow[], id: string): FolderRow[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: FolderRow[] = [];
  let current = byId.get(id);
  while (current && path.length <= folders.length) {
    if (path.some((folder) => folder.id === current!.id)) break;
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

/** Le dossier et tous ses descendants (recherche « dans ce dossier »). */
export function descendantIds(folders: FolderRow[], id: string): string[] {
  const result = [id];
  for (let index = 0; index < result.length; index += 1) {
    for (const folder of folders) {
      if (folder.parentId === result[index] && !result.includes(folder.id)) {
        result.push(folder.id);
      }
    }
  }
  return result;
}

export type FolderTreeItem<T extends FolderRow> = T & { depth: number };

/** Arborescence à plat (parcours en profondeur, frères triés par nom). */
export function flattenFolderTree<T extends FolderRow>(
  folders: T[],
): FolderTreeItem<T>[] {
  const byParent = new Map<string | null, T[]>();
  for (const folder of folders) {
    const siblings = byParent.get(folder.parentId) ?? [];
    siblings.push(folder);
    byParent.set(folder.parentId, siblings);
  }
  const result: FolderTreeItem<T>[] = [];
  const visit = (parentId: string | null, depth: number) => {
    const children = (byParent.get(parentId) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, "fr", { sensitivity: "base" }),
    );
    for (const child of children) {
      if (result.some((item) => item.id === child.id)) continue;
      result.push({ ...child, depth });
      if (depth < MAX_FOLDER_DEPTH + 1) visit(child.id, depth + 1);
    }
  };
  visit(null, 1);
  return result;
}

// ─────────────────────────── Paramètres de navigation ───────────────────────────

const MEDIA_TYPES = ["tous", "images", "pdf"] as const;
const MEDIA_SORTS = ["recents", "anciens", "nom"] as const;
const SEARCH_SCOPES = ["dossier", "tout"] as const;

export type MediaTypeFilter = (typeof MEDIA_TYPES)[number];

// Paramètres d'URL tolérants : une valeur invalide retombe sur sa valeur par défaut.
export const mediaQuerySchema = z.object({
  dossier: z.string().trim().max(30).catch(""),
  q: z.string().trim().max(100).catch(""),
  portee: z.enum(SEARCH_SCOPES).catch("dossier"),
  type: z.enum(MEDIA_TYPES).catch("tous"),
  tri: z.enum(MEDIA_SORTS).catch("recents"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  vue: z.enum(["tous", "inutilises"]).catch("tous"),
});

export type MediaQuery = z.output<typeof mediaQuerySchema>;

export const DEFAULT_MEDIA_QUERY: MediaQuery = mediaQuerySchema.parse({});

/** Lecture des paramètres (searchParams de page ou URLSearchParams). */
export function parseMediaQuery(
  input: Record<string, string | string[] | undefined> | URLSearchParams,
): MediaQuery {
  const raw: Record<string, string> = {};
  const entries =
    input instanceof URLSearchParams
      ? [...input.entries()]
      : Object.entries(input);
  for (const [key, value] of entries) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === "string" && !(key in raw)) raw[key] = first;
  }
  return mediaQuerySchema.parse(raw);
}

/** Paramètres d'URL ne contenant que les valeurs différentes des défauts. */
export function mediaQueryParams(
  query: MediaQuery,
  overrides: Partial<MediaQuery> = {},
): URLSearchParams {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();
  for (const key of Object.keys(DEFAULT_MEDIA_QUERY) as (keyof MediaQuery)[]) {
    const value = merged[key];
    if (value !== DEFAULT_MEDIA_QUERY[key]) params.set(key, String(value));
  }
  return params;
}

export function mediaQueryHref(
  base: string,
  query: MediaQuery,
  overrides: Partial<MediaQuery> = {},
): string {
  const params = mediaQueryParams(query, overrides).toString();
  return params ? `${base}?${params}` : base;
}

const KIND_OF_TYPE = {
  tous: undefined,
  images: "IMAGE",
  pdf: "DOCUMENT",
} as const;

/** Média utilisé nulle part (vue « non utilisés »). */
const UNUSED_WHERE: Prisma.MediaWhereInput = {
  projectCovers: { none: {} },
  projectIcons: { none: {} },
  versionCovers: { none: {} },
  screenshots: { none: {} },
  settingsAsCv: { none: {} },
  settingsAsOgImage: { none: {} },
  settingsAsProfile: { none: {} },
  timelineEntries: { none: {} },
};

/**
 * Filtre Prisma. Navigation : contenu direct du dossier. Recherche : le dossier
 * et ses sous-dossiers, ou toute la médiathèque (portée « tout »).
 * `contains` est échappé par Prisma ; la collation _ci ignore la casse et les accents.
 */
export function buildMediaWhere(
  query: MediaQuery,
  folders: FolderRow[],
): Prisma.MediaWhereInput {
  const and: Prisma.MediaWhereInput[] = [];
  const kind = KIND_OF_TYPE[query.type];
  if (kind) and.push({ kind });
  if (query.q) {
    and.push({
      OR: [
        { originalName: { contains: query.q } },
        { alt: { contains: query.q } },
      ],
    });
  }
  const searchEverywhere = query.q !== "" && query.portee === "tout";
  if (!searchEverywhere && query.dossier) {
    if (query.dossier === UNCLASSIFIED) {
      and.push({ folderId: null });
    } else {
      and.push(
        query.q
          ? { folderId: { in: descendantIds(folders, query.dossier) } }
          : { folderId: query.dossier },
      );
    }
  }
  if (query.vue === "inutilises") and.push(UNUSED_WHERE);
  return and.length > 0 ? { AND: and } : {};
}

export function buildMediaOrderBy(
  sort: MediaQuery["tri"],
): Prisma.MediaOrderByWithRelationInput[] {
  // L'identifiant départage les égalités : pagination stable.
  if (sort === "anciens") return [{ createdAt: "asc" }, { id: "asc" }];
  if (sort === "nom") return [{ originalName: "asc" }, { id: "asc" }];
  return [{ createdAt: "desc" }, { id: "desc" }];
}

export function pageCountFor(total: number): number {
  return Math.max(1, Math.ceil(total / MEDIA_PAGE_SIZE));
}
