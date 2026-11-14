import type { MediaKind } from "@/generated/prisma/enums";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
/** Plus grande taille acceptée, tous formats confondus (contrôle avant lecture). */
export const MAX_UPLOAD_BYTES = Math.max(MAX_IMAGE_BYTES, MAX_DOCUMENT_BYTES);

export type FileFormat = "jpeg" | "png" | "webp" | "avif" | "pdf";

const FORMATS: Record<
  FileFormat,
  { kind: MediaKind; extensions: string[]; maxBytes: number }
> = {
  jpeg: {
    kind: "IMAGE",
    extensions: ["jpg", "jpeg"],
    maxBytes: MAX_IMAGE_BYTES,
  },
  png: { kind: "IMAGE", extensions: ["png"], maxBytes: MAX_IMAGE_BYTES },
  webp: { kind: "IMAGE", extensions: ["webp"], maxBytes: MAX_IMAGE_BYTES },
  avif: { kind: "IMAGE", extensions: ["avif"], maxBytes: MAX_IMAGE_BYTES },
  pdf: { kind: "DOCUMENT", extensions: ["pdf"], maxBytes: MAX_DOCUMENT_BYTES },
};

/** Valeur de l'attribut accept du champ de fichier. */
export const ACCEPTED_FILE_TYPES =
  ".jpg,.jpeg,.png,.webp,.avif,.pdf,image/jpeg,image/png,image/webp,image/avif,application/pdf";

const ACCEPTED_LABEL = "JPEG, PNG, WebP, AVIF ou PDF";

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

/** AVIF : boîte ISO-BMFF « ftyp » dont une marque est avif/avis. */
function isAvif(bytes: Uint8Array): boolean {
  if (bytes.length < 16 || ascii(bytes, 4, 8) !== "ftyp") return false;
  const boxSize =
    ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>>
    0;
  const end = Math.min(boxSize, bytes.length, 256);
  const brands = [ascii(bytes, 8, 12)];
  for (let offset = 16; offset + 4 <= end; offset += 4) {
    brands.push(ascii(bytes, offset, offset + 4));
  }
  return brands.some((brand) => brand === "avif" || brand === "avis");
}

/**
 * Format réel d'après la signature binaire : le type MIME et l'extension annoncés
 * par le navigateur ne sont pas fiables. SVG, GIF, HTML… ne sont jamais reconnus.
 */
export function detectFormat(bytes: Uint8Array): FileFormat | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  if (isAvif(bytes)) return "avif";
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") return "pdf";
  return null;
}

function extensionOf(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  return match ? match[1]!.toLowerCase() : "";
}

export type FileCheck =
  | { ok: true; format: FileFormat; kind: MediaKind }
  | { ok: false; error: string };

function megabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} Mo`;
}

/** Contrôle d'un fichier envoyé : extension, signature, cohérence des deux, taille. */
export function checkUploadedFile(file: {
  name: string;
  bytes: Uint8Array;
}): FileCheck {
  if (file.bytes.length === 0) {
    return { ok: false, error: "Le fichier est vide." };
  }

  const extension = extensionOf(file.name);
  const declared = (Object.keys(FORMATS) as FileFormat[]).find((format) =>
    FORMATS[format].extensions.includes(extension),
  );
  if (!declared) {
    return {
      ok: false,
      error: `Format non accepté : ${ACCEPTED_LABEL} uniquement (SVG refusé).`,
    };
  }

  const detected = detectFormat(file.bytes);
  if (!detected) {
    return {
      ok: false,
      error: "Le contenu du fichier ne correspond à aucun format accepté.",
    };
  }
  if (FORMATS[detected].kind !== FORMATS[declared].kind) {
    return {
      ok: false,
      error: "L'extension ne correspond pas au contenu réel du fichier.",
    };
  }

  const { kind, maxBytes } = FORMATS[detected];
  if (file.bytes.length > maxBytes) {
    return {
      ok: false,
      error: `Fichier trop volumineux : ${megabytes(maxBytes)} maximum pour ${kind === "IMAGE" ? "une image" : "un PDF"}.`,
    };
  }

  return { ok: true, format: detected, kind };
}

/**
 * Nom d'origine conservé pour l'affichage uniquement (jamais comme chemin) :
 * sans dossier, sans caractère de contrôle, borné à la colonne SQL.
 */
export function sanitizeOriginalName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 255);
  return cleaned || "fichier";
}
