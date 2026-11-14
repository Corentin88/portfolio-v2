/** En-tête Content-Disposition sûr : ASCII de repli + nom UTF-8 encodé (RFC 6266). */
export function contentDisposition(
  type: "inline" | "attachment",
  fileName: string,
): string {
  const fallback =
    fileName
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .slice(0, 100) || "fichier";
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/** Publics : cache court, une dépublication doit vite prendre effet. */
export const PUBLIC_MEDIA_CACHE = "public, max-age=600";
/** Réservés à l'administration : jamais mis en cache. */
export const PRIVATE_MEDIA_CACHE = "private, no-store";

/**
 * Réponse d'un fichier stocké. nosniff empêche le navigateur d'interpréter le
 * contenu autrement que selon le type enregistré (images réencodées, PDF vérifié).
 */
export function fileResponse(
  data: Uint8Array,
  options: {
    mimeType: string;
    cacheControl: string;
    disposition?: string;
  },
): Response {
  const headers = new Headers({
    "Content-Type": options.mimeType,
    "Content-Length": String(data.byteLength),
    "Cache-Control": options.cacheControl,
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
  });
  // Une image n'a besoin d'aucune ressource : document inerte s'il est ouvert seul.
  // Pas de « sandbox » sur les PDF : Chrome refuse alors d'afficher sa visionneuse.
  if (options.mimeType.startsWith("image/")) {
    headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
  }
  if (options.disposition) {
    headers.set("Content-Disposition", options.disposition);
  }
  return new Response(new Uint8Array(data), { headers });
}

export function notFoundResponse(): Response {
  return new Response("Introuvable", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": PRIVATE_MEDIA_CACHE,
    },
  });
}
