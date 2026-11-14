import { updateTag } from "next/cache";
import { PUBLIC_CONTENT_TAG } from "@/lib/cache-tags";

/**
 * Invalide les lectures publiques mises en cache : la prochaine visite relit la base.
 * updateTag n'est utilisable que dans une Server Action (lecture immédiate de ses écritures).
 */
export function invalidatePublicContent(): void {
  updateTag(PUBLIC_CONTENT_TAG);
}
