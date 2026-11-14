import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { listPublicProjectEntries } from "@/features/projects/queries";
import { resolveSiteUrl } from "@/lib/site-url";

/** Accueil et projets publiés uniquement (brouillons et archives exclus). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Rendu à la requête : aucune base n'est nécessaire au build.
  await connection();
  const [base, projects] = await Promise.all([
    resolveSiteUrl(),
    listPublicProjectEntries(),
  ]);
  if (!base) return [];
  return [
    { url: new URL("/", base).href, changeFrequency: "monthly", priority: 1 },
    ...projects.map(({ slug, updatedAt }) => ({
      url: new URL(`/projets/${slug}`, base).href,
      lastModified: updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
