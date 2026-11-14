import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { PUBLIC_CONTENT_TAG } from "@/lib/cache-tags";
import {
  toPublicSiteSettings,
  type PublicSiteSettings,
} from "@/features/site-settings/public-view";

/** Réglages publics du site, ou null si la ligne n'a pas encore été créée. */
export async function getPublicSiteSettings(): Promise<PublicSiteSettings | null> {
  "use cache";
  cacheTag(PUBLIC_CONTENT_TAG);
  cacheLife("hours");

  const row = await db.siteSettings.findUnique({
    where: { id: 1 },
    select: {
      heroStatusLabel: true,
      heroRoleLine: true,
      heroTagline: true,
      heroTaglineSub: true,
      presentationTitle: true,
      presentationBody: true,
      presentationQuote: true,
      contactEmail: true,
      availabilityNote: true,
      linkedinUrl: true,
      githubUrl: true,
      seoTitle: true,
      seoDescription: true,
      cvMediaId: true,
      ogImageMedia: {
        select: { storageKey: true, width: true, height: true, alt: true },
      },
      profilePhotoMedia: {
        select: { storageKey: true, width: true, height: true, alt: true },
      },
    },
  });
  return row ? toPublicSiteSettings(row) : null;
}

/** Lecture non mise en cache pour l'administration (toujours la valeur en base). */
export async function getAdminSiteSettings() {
  return db.siteSettings.findUnique({
    where: { id: 1 },
    select: {
      heroStatusLabel: true,
      heroRoleLine: true,
      heroTagline: true,
      heroTaglineSub: true,
      presentationTitle: true,
      presentationBody: true,
      presentationQuote: true,
      contactEmail: true,
      availabilityNote: true,
      linkedinUrl: true,
      githubUrl: true,
      seoTitle: true,
      seoDescription: true,
      updatedAt: true,
    },
  });
}

export type AdminSiteSettings = NonNullable<
  Awaited<ReturnType<typeof getAdminSiteSettings>>
>;
