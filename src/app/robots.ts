import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { resolveSiteUrl } from "@/lib/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Rendu à la requête : l'adresse du sitemap dépend de SITE_URL ou de l'hôte.
  await connection();
  const base = await resolveSiteUrl();
  return {
    // /admin porte aussi « noindex » ; /media n'expose que des fichiers déjà liés.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: base ? new URL("/sitemap.xml", base).href : undefined,
  };
}
