import {
  toPublicImage,
  type ImageMedia,
  type PublicImage,
} from "@/features/media/media-view";

// Domaines réservés aux exemples et aux tests (RFC 2606 / RFC 6761) : une adresse
// sur l'un d'eux est une valeur provisoire du seed, jamais une coordonnée réelle.
const RESERVED_EMAIL_DOMAIN =
  /@(?:[^@]+\.)?(?:example\.(?:com|net|org)|example|invalid|test|localhost)$/i;

export function isPlaceholderEmail(email: string): boolean {
  return RESERVED_EMAIL_DOMAIN.test(email.trim());
}

function httpUrlOrNull(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export type SiteSettingsRow = {
  heroStatusLabel: string;
  heroRoleLine: string;
  heroTagline: string;
  heroTaglineSub: string;
  presentationTitle: string;
  presentationBody: string;
  presentationQuote: string | null;
  contactEmail: string;
  availabilityNote: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  seoTitle: string;
  seoDescription: string;
  ogImageMedia: ImageMedia | null;
  profilePhotoMedia: ImageMedia | null;
  cvMediaId: string | null;
};

/** Adresse stable du CV, servie par le Route Handler /cv. */
export const CV_PATH = "/cv";

export type PublicSiteSettings = {
  seo: { title: string; description: string; image: PublicImage | null };
  hero: {
    statusLabel: string;
    roleLine: string;
    tagline: string;
    taglineSub: string;
  };
  presentation: {
    title: string;
    paragraphs: string[];
    quote: string | null;
    /** Photo de la carte de visite ; null → initiales. */
    photo: PublicImage | null;
  };
  /** null tant que l'adresse est une valeur provisoire : rien n'est affiché. */
  contactEmail: string | null;
  availabilityNote: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  /** null tant qu'aucun PDF n'est désigné comme CV. */
  cvUrl: string | null;
};

export function toPublicSiteSettings(row: SiteSettingsRow): PublicSiteSettings {
  return {
    seo: {
      title: row.seoTitle,
      description: row.seoDescription,
      image: row.ogImageMedia ? toPublicImage(row.ogImageMedia) : null,
    },
    hero: {
      statusLabel: row.heroStatusLabel,
      roleLine: row.heroRoleLine,
      tagline: row.heroTagline,
      taglineSub: row.heroTaglineSub,
    },
    presentation: {
      title: row.presentationTitle,
      paragraphs: row.presentationBody
        .split(/\r?\n\s*\r?\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
      quote: row.presentationQuote?.trim() || null,
      photo: row.profilePhotoMedia
        ? toPublicImage(row.profilePhotoMedia, { variant: "thumbnail" })
        : null,
    },
    contactEmail: isPlaceholderEmail(row.contactEmail)
      ? null
      : row.contactEmail.trim(),
    availabilityNote: row.availabilityNote?.trim() || null,
    linkedinUrl: httpUrlOrNull(row.linkedinUrl),
    githubUrl: httpUrlOrNull(row.githubUrl),
    cvUrl: row.cvMediaId ? CV_PATH : null,
  };
}
