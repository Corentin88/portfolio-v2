import { mediaUrl, type MediaVariant } from "@/lib/media-keys";

/** Usages d'un média tels que lus pour l'administration. */
export type MediaUsageRow = {
  projectCovers: Array<{ title: string }>;
  projectIcons: Array<{ title: string }>;
  versionCovers: Array<{ label: string; project: { title: string } }>;
  screenshots: Array<{
    version: { label: string; project: { title: string } };
  }>;
  settingsAsCv: Array<{ id: number }>;
  settingsAsOgImage: Array<{ id: number }>;
  settingsAsProfile: Array<{ id: number }>;
  timelineEntries: Array<{ title: string }>;
};

/** Liste lisible des endroits où le média est utilisé (vide = non utilisé). */
export function describeUsages(row: MediaUsageRow): string[] {
  return [
    ...row.projectCovers.map(
      ({ title }) => `couverture du projet « ${title} »`,
    ),
    ...row.projectIcons.map(({ title }) => `logo du projet « ${title} »`),
    ...row.versionCovers.map(
      ({ label, project }) => `couverture de « ${project.title} » (${label})`,
    ),
    ...row.screenshots.map(
      ({ version }) =>
        `galerie de « ${version.project.title} » (${version.label})`,
    ),
    ...row.settingsAsCv.map(() => "CV du site"),
    ...row.settingsAsOgImage.map(() => "image de partage du site"),
    ...row.settingsAsProfile.map(() => "photo de la carte de visite"),
    ...row.timelineEntries.map(
      ({ title }) => `illustration de l'étape « ${title} »`,
    ),
  ];
}

/**
 * Nombre d'usages publics d'un média : couvertures et logos de projets visibles,
 * couvertures et captures de versions publiées de projets visibles, CV, image de
 * partage, photo de profil et illustrations d'étapes visibles.
 */
export type PublicUsageCounts = {
  projectCovers: number;
  projectIcons: number;
  versionCovers: number;
  screenshots: number;
  settingsAsCv: number;
  settingsAsOgImage: number;
  settingsAsProfile: number;
  timelineEntries: number;
};

/**
 * Un média n'est servi sans session que s'il est rattaché à un contenu public :
 * un fichier lié uniquement à un brouillon (ou non utilisé) reste privé même si
 * son URL est connue.
 */
export function isPubliclyAccessible(counts: PublicUsageCounts): boolean {
  return Object.values(counts).some((count) => count > 0);
}

export type ImageMedia = {
  storageKey: string;
  width: number | null;
  height: number | null;
  alt: string;
};

export type PublicImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

/** Image prête à afficher ; les dimensions enregistrées évitent tout décalage. */
export function toPublicImage(
  media: ImageMedia,
  options: { alt?: string | null; variant?: MediaVariant } = {},
): PublicImage | null {
  if (!media.width || !media.height) return null;
  const variant = options.variant ?? "original";
  // La miniature garde le ratio de l'original, réduit à 960 px au plus.
  const scale =
    variant === "thumbnail"
      ? Math.min(1, 960 / Math.max(media.width, media.height))
      : 1;
  return {
    src: mediaUrl(media.storageKey, variant),
    width: Math.round(media.width * scale),
    height: Math.round(media.height * scale),
    alt: options.alt?.trim() || media.alt,
  };
}

export type ScreenshotRow = {
  alt: string | null;
  caption: string | null;
  media: ImageMedia;
};

/** Galerie d'une version : le texte alternatif propre à la capture prime sur Media.alt. */
export function toGalleryImages(
  screenshots: ScreenshotRow[],
): Array<PublicImage & { caption: string | null }> {
  return screenshots.flatMap(({ alt, caption, media }) => {
    const image = toPublicImage(media, { alt });
    return image ? [{ ...image, caption: caption?.trim() || null }] : [];
  });
}

export type VersionCoverSource =
  "version" | "screenshot" | "project" | "generated";

/**
 * Image d'une version : sa couverture → sa 1re capture → la couverture du projet
 * → couverture générée (null). Règle d'ARCHITECTURE §9.
 */
export function resolveVersionCover(input: {
  versionCover: ImageMedia | null;
  screenshots: ScreenshotRow[];
  projectCover: ImageMedia | null;
}): { source: VersionCoverSource; image: PublicImage | null } {
  if (input.versionCover) {
    return { source: "version", image: toPublicImage(input.versionCover) };
  }
  const [first] = input.screenshots;
  if (first) {
    return {
      source: "screenshot",
      image: toPublicImage(first.media, { alt: first.alt }),
    };
  }
  if (input.projectCover) {
    return { source: "project", image: toPublicImage(input.projectCover) };
  }
  return { source: "generated", image: null };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
