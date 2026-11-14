import { headers } from "next/headers";
import { getSiteUrl } from "@/lib/env";

/**
 * Origine déduite des en-têtes de la requête (hôte transmis par le proxy).
 * Pure, pour être testée sans requête.
 */
export function siteUrlFromHeaders(requestHeaders: Headers): URL | null {
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return null;
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http" : "https");
  try {
    const url = new URL(`${protocol}://${host}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Base des URL absolues (canonique, Open Graph, sitemap) : SITE_URL si définie —
 * à exiger en production, l'en-tête Host restant fourni par le client —, sinon
 * l'hôte de la requête. À appeler dans un rendu dynamique (après connection()).
 */
export async function resolveSiteUrl(): Promise<URL | null> {
  return getSiteUrl() ?? siteUrlFromHeaders(await headers());
}
