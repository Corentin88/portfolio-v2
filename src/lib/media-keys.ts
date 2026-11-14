// Clés de stockage générées uniquement par l'application : jamais le nom d'origine.
// Le nom aléatoire (128 bits) n'est pas devinable, mais l'accès reste contrôlé à
// chaque requête par /media (publication vérifiée) : connaître la clé ne suffit pas.
// Module sans dépendance Node : utilisable dans tout composant.

const IMAGE_KEY = /^images\/\d{4}\/(0[1-9]|1[0-2])\/[a-f0-9]{32}\.webp$/;
const THUMBNAIL_KEY =
  /^images\/\d{4}\/(0[1-9]|1[0-2])\/[a-f0-9]{32}\.w960\.webp$/;
const DOCUMENT_KEY = /^documents\/[a-f0-9]{32}\.pdf$/;
const THUMBNAIL_SUFFIX = ".w960.webp";

export type MediaVariant = "original" | "thumbnail";

export function randomFileName(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function newImageKey(now: Date = new Date()): string {
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `images/${now.getUTCFullYear()}/${month}/${randomFileName()}.webp`;
}

export function newDocumentKey(): string {
  return `documents/${randomFileName()}.pdf`;
}

/** Clé d'une ligne Media (fichier principal). */
export function isMediaKey(key: string): boolean {
  return IMAGE_KEY.test(key) || DOCUMENT_KEY.test(key);
}

export function isImageKey(key: string): boolean {
  return IMAGE_KEY.test(key);
}

/** Tout fichier que l'application peut écrire : média principal ou miniature. */
export function isStoredFileKey(key: string): boolean {
  return isMediaKey(key) || THUMBNAIL_KEY.test(key);
}

/** Miniature (≤ 960 px) enregistrée à côté de chaque image. */
export function thumbnailKey(imageKey: string): string {
  if (!IMAGE_KEY.test(imageKey)) throw new Error("Clé d'image invalide.");
  return imageKey.slice(0, -".webp".length) + THUMBNAIL_SUFFIX;
}

/** Tous les fichiers sur disque associés à une ligne Media. */
export function storedKeysFor(storageKey: string): string[] {
  return isImageKey(storageKey)
    ? [storageKey, thumbnailKey(storageKey)]
    : [storageKey];
}

/**
 * Chemin demandé à /media → clé de la ligne Media et variante. null pour tout
 * chemin qui n'a pas exactement la forme d'une clé générée (traversée, encodage…).
 */
export function parseRequestedKey(
  key: string,
): { storageKey: string; variant: MediaVariant } | null {
  if (isMediaKey(key)) return { storageKey: key, variant: "original" };
  if (THUMBNAIL_KEY.test(key)) {
    return {
      storageKey: key.slice(0, -THUMBNAIL_SUFFIX.length) + ".webp",
      variant: "thumbnail",
    };
  }
  return null;
}

/** URL publique d'un média (la miniature n'existe que pour les images). */
export function mediaUrl(
  storageKey: string,
  variant: MediaVariant = "original",
): string {
  const key =
    variant === "thumbnail" && isImageKey(storageKey)
      ? thumbnailKey(storageKey)
      : storageKey;
  return `/media/${key}`;
}
