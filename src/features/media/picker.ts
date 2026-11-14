import {
  describeUsages,
  type MediaUsageRow,
} from "@/features/media/media-view";
import { isImageKey, mediaUrl } from "@/lib/media-keys";

// Données et règles du sélecteur universel, partagées par l'API d'administration
// et le composant client (aucun accès à la base ici).

/** Contrainte de type selon le contexte (couverture → images, CV → PDF…). */
export type MediaAccept = "IMAGE" | "DOCUMENT" | "ALL";

export type PickerMedia = {
  id: string;
  kind: "IMAGE" | "DOCUMENT";
  name: string;
  alt: string;
  /** Miniature (≤ 960 px) pour les images ; null pour un PDF. */
  thumbSrc: string | null;
  /** Fichier d'origine (ouverture dans un onglet, jamais chargé dans la grille). */
  src: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  folderId: string | null;
  usageCount: number;
};

/** Valeur d'un champ de sélection : de quoi afficher l'aperçu du média choisi. */
export type PickerValue = {
  id: string;
  kind: "IMAGE" | "DOCUMENT";
  name: string;
  alt: string;
  thumbSrc: string | null;
};

/** Valeur initiale d'un champ à partir d'un média déjà associé (lecture serveur). */
export function toPickerValue(
  media: {
    id: string;
    storageKey: string;
    alt: string;
    originalName?: string;
  } | null,
): PickerValue | null {
  if (!media) return null;
  const isImage = isImageKey(media.storageKey);
  return {
    id: media.id,
    kind: isImage ? "IMAGE" : "DOCUMENT",
    name: media.originalName ?? (media.alt || "Média"),
    alt: media.alt,
    thumbSrc: isImage ? mediaUrl(media.storageKey, "thumbnail") : null,
  };
}

export type PickerFolder = {
  id: string;
  name: string;
  parentId: string | null;
  mediaCount: number;
};

export type PickerPage = {
  items: PickerMedia[];
  total: number;
  page: number;
  pageCount: number;
  folders: PickerFolder[];
  unclassifiedCount: number;
};

export type PickerMediaRow = MediaUsageRow & {
  id: string;
  kind: "IMAGE" | "DOCUMENT";
  storageKey: string;
  originalName: string;
  alt: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  folderId: string | null;
};

export function toPickerMedia(row: PickerMediaRow): PickerMedia {
  return {
    id: row.id,
    kind: row.kind,
    name: row.originalName,
    alt: row.alt,
    thumbSrc:
      row.kind === "IMAGE" ? mediaUrl(row.storageKey, "thumbnail") : null,
    src: mediaUrl(row.storageKey),
    width: row.width,
    height: row.height,
    sizeBytes: row.sizeBytes,
    folderId: row.folderId,
    usageCount: describeUsages(row).length,
  };
}

/** Type de filtre imposé par le contexte (« tous » seulement si tout est permis). */
export function typeFilterFor(accept: MediaAccept): "tous" | "images" | "pdf" {
  if (accept === "IMAGE") return "images";
  if (accept === "DOCUMENT") return "pdf";
  return "tous";
}

export function acceptsMedia(
  accept: MediaAccept,
  media: Pick<PickerValue, "kind">,
): boolean {
  return accept === "ALL" || media.kind === accept;
}

/**
 * Clic sur un média. Sélection simple : il remplace le choix (ou le retire s'il
 * était déjà choisi). Multiple : ajout en fin de liste ou retrait, sans doublon,
 * l'ordre de sélection étant conservé d'une page ou d'un dossier à l'autre.
 * Un média exclu (déjà dans la galerie) ou d'un type refusé est ignoré.
 */
export function toggleSelection<T extends PickerValue>(
  selected: T[],
  media: T,
  options: {
    multiple: boolean;
    accept: MediaAccept;
    excluded?: ReadonlySet<string>;
  },
): T[] {
  if (!acceptsMedia(options.accept, media)) return selected;
  if (options.excluded?.has(media.id)) return selected;
  const isSelected = selected.some((item) => item.id === media.id);
  if (!options.multiple) return isSelected ? [] : [media];
  return isSelected
    ? selected.filter((item) => item.id !== media.id)
    : [...selected, media];
}
