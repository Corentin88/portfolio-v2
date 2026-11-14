import type { NextRequest } from "next/server";
import { connection } from "next/server";
import { getCurrentAdmin } from "@/features/auth/require-admin";
import {
  contentDisposition,
  fileResponse,
  notFoundResponse,
  PRIVATE_MEDIA_CACHE,
  PUBLIC_MEDIA_CACHE,
} from "@/features/media/delivery";
import { isPubliclyAccessible } from "@/features/media/media-view";
import { getMediaForDelivery } from "@/features/media/queries";
import { parseRequestedKey, thumbnailKey } from "@/lib/media-keys";
import { readMediaFile } from "@/lib/media-storage";

/**
 * Sert un fichier de la bibliothèque. Sans session, seul un média rattaché à un
 * contenu public est servi ; tout autre cas (clé invalide, inconnue, brouillon,
 * non utilisé) répond 404 sans distinction, pour ne rien révéler.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/media/[...key]">,
) {
  await connection();
  const { key } = await context.params;
  const requested = parseRequestedKey(key.join("/"));
  if (!requested) return notFoundResponse();

  const media = await getMediaForDelivery(requested.storageKey);
  if (!media) return notFoundResponse();

  const isPublic = isPubliclyAccessible(media.publicUsages);
  if (!isPublic && !(await getCurrentAdmin())) return notFoundResponse();

  const fileKey =
    requested.variant === "thumbnail"
      ? thumbnailKey(media.storageKey)
      : media.storageKey;
  const data = await readMediaFile(fileKey);
  if (!data) {
    console.warn(
      JSON.stringify({
        level: "warn",
        message: "media.file_missing",
        key: fileKey,
      }),
    );
    return notFoundResponse();
  }

  return fileResponse(data, {
    mimeType: media.mimeType,
    cacheControl: isPublic ? PUBLIC_MEDIA_CACHE : PRIVATE_MEDIA_CACHE,
    disposition:
      media.kind === "DOCUMENT"
        ? contentDisposition("inline", media.originalName)
        : undefined,
  });
}
