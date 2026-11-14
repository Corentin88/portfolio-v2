import {
  resolveVersionCover,
  toGalleryImages,
  toPublicImage,
  type ImageMedia,
  type PublicImage,
  type ScreenshotRow,
} from "@/features/media/media-view";
import { toBadgeTone, type BadgeTone } from "@/features/projects/badge-tones";

/** Logo importé, prioritaire sur l'icône Lucide (iconKey) qui reste le repli. */
function iconImageOf(media: ImageMedia | null): PublicImage | null {
  return media ? toPublicImage(media, { variant: "thumbnail" }) : null;
}

export type ProjectRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  context: string | null;
  badgeLabel: string | null;
  badgeTone: string;
  iconKey: string;
  featured: boolean;
  category: { name: string; slug: string; position: number };
  coverMedia: ImageMedia | null;
  iconMedia: ImageMedia | null;
  /** Versions publiées, de la plus ancienne à la plus récente. */
  versions: Array<{
    label: string;
    technologies: Array<{ technology: { name: string } }>;
  }>;
};

export type ProjectCardData = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  context: string | null;
  badgeLabel: string | null;
  badgeTone: BadgeTone;
  iconKey: string;
  iconImage: PublicImage | null;
  featured: boolean;
  category: { name: string; slug: string };
  versionCount: number;
  latestVersionLabel: string;
  technologies: string[];
  monogram: string;
  /** Couverture du projet (miniature) ; null → couverture générée. */
  coverImage: PublicImage | null;
};

export type ProjectCategoryFilter = {
  name: string;
  slug: string;
  count: number;
};

/** Deux premières lettres du titre, comme les couvertures générées de la maquette (« Bé »). */
export function monogramFor(title: string): string {
  const letters = Array.from(title.replace(/[^\p{L}\p{N}]/gu, ""));
  const [first = "", second = ""] = letters;
  return first.toUpperCase() + second.toLowerCase();
}

/** null si le projet n'a aucune version publiée (ne doit pas arriver avec publicProjectWhere). */
export function toProjectCard(project: ProjectRow): ProjectCardData | null {
  const latest = project.versions.at(-1);
  if (!latest) return null;

  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    context: project.context,
    badgeLabel: project.badgeLabel,
    badgeTone: toBadgeTone(project.badgeTone),
    iconKey: project.iconKey,
    iconImage: iconImageOf(project.iconMedia),
    featured: project.featured,
    category: { name: project.category.name, slug: project.category.slug },
    versionCount: project.versions.length,
    latestVersionLabel: latest.label,
    technologies: latest.technologies.map(({ technology }) => technology.name),
    monogram: monogramFor(project.title),
    coverImage: project.coverMedia
      ? toPublicImage(project.coverMedia, { variant: "thumbnail" })
      : null,
  };
}

/** Catégories ayant au moins un projet visible, dans l'ordre défini dans l'administration. */
export function projectCategoryFilters(
  projects: ProjectRow[],
): ProjectCategoryFilter[] {
  const bySlug = new Map<
    string,
    ProjectCategoryFilter & { position: number }
  >();
  for (const { category } of projects) {
    const existing = bySlug.get(category.slug);
    if (existing) existing.count += 1;
    else bySlug.set(category.slug, { ...category, count: 1 });
  }
  return [...bySlug.values()]
    .sort(
      (a, b) => a.position - b.position || a.name.localeCompare(b.name, "fr"),
    )
    .map(({ name, slug, count }) => ({ name, slug, count }));
}

// ─────────────────────────── Fiche détaillée d'un projet ───────────────────────────

export type ProjectDetailRow = {
  slug: string;
  title: string;
  summary: string;
  context: string | null;
  badgeLabel: string | null;
  badgeTone: string;
  iconKey: string;
  seoTitle: string | null;
  seoDescription: string | null;
  category: { name: string; slug: string };
  coverMedia: ImageMedia | null;
  iconMedia: ImageMedia | null;
  /** Versions publiées, dans l'ordre défini dans l'administration. */
  versions: Array<{
    slug: string;
    label: string;
    periodLabel: string | null;
    releasedAt: Date | null;
    description: string;
    sourceUrl: string | null;
    demoUrl: string | null;
    coverMedia: ImageMedia | null;
    highlights: Array<{ kind: "FEATURE" | "IMPROVEMENT"; text: string }>;
    challenges: Array<{ problem: string; solution: string }>;
    technologies: Array<{ technology: { name: string } }>;
    screenshots: ScreenshotRow[];
  }>;
};

export type GalleryImage = PublicImage & {
  caption: string | null;
  /** Miniature (≤ 960 px) pour les vignettes de la galerie. */
  thumbnailSrc: string;
};

export type PublicVersion = {
  slug: string;
  label: string;
  /** Période saisie, sinon mois de sortie (« mars 2025 »), sinon null. */
  period: string | null;
  description: string;
  sourceUrl: string | null;
  demoUrl: string | null;
  features: string[];
  improvements: string[];
  challenges: Array<{ problem: string; solution: string }>;
  technologies: string[];
  screenshots: GalleryImage[];
  /** Image de repli sans capture (couverture de version ou du projet). */
  cover: PublicImage | null;
};

export type PublicProjectDetail = {
  slug: string;
  title: string;
  summary: string;
  context: string | null;
  badgeLabel: string | null;
  badgeTone: BadgeTone;
  iconKey: string;
  iconImage: PublicImage | null;
  monogram: string;
  seoTitle: string | null;
  seoDescription: string | null;
  category: { name: string; slug: string };
  coverImage: PublicImage | null;
  versions: PublicVersion[];
};

const monthFormat = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function versionPeriod(
  periodLabel: string | null,
  releasedAt: Date | null,
): string | null {
  if (periodLabel?.trim()) return periodLabel.trim();
  return releasedAt ? monthFormat.format(releasedAt) : null;
}

/** null si aucune version publiée (projet à ne pas afficher). */
export function toProjectDetail(
  row: ProjectDetailRow,
): PublicProjectDetail | null {
  if (row.versions.length === 0) return null;

  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    context: row.context,
    badgeLabel: row.badgeLabel,
    badgeTone: toBadgeTone(row.badgeTone),
    iconKey: row.iconKey,
    iconImage: iconImageOf(row.iconMedia),
    monogram: monogramFor(row.title),
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    category: row.category,
    coverImage: row.coverMedia ? toPublicImage(row.coverMedia) : null,
    versions: row.versions.map((version) => {
      const screenshots = version.screenshots.flatMap((shot) => {
        const [image] = toGalleryImages([shot]);
        if (!image) return [];
        const thumbnail = toPublicImage(shot.media, { variant: "thumbnail" });
        return [{ ...image, thumbnailSrc: thumbnail?.src ?? image.src }];
      });
      const cover = resolveVersionCover({
        versionCover: version.coverMedia,
        screenshots: [],
        projectCover: row.coverMedia,
      }).image;
      return {
        slug: version.slug,
        label: version.label,
        period: versionPeriod(version.periodLabel, version.releasedAt),
        description: version.description,
        sourceUrl: version.sourceUrl,
        demoUrl: version.demoUrl,
        features: version.highlights
          .filter((highlight) => highlight.kind === "FEATURE")
          .map((highlight) => highlight.text),
        improvements: version.highlights
          .filter((highlight) => highlight.kind === "IMPROVEMENT")
          .map((highlight) => highlight.text),
        challenges: version.challenges,
        technologies: version.technologies.map(
          ({ technology }) => technology.name,
        ),
        screenshots,
        cover,
      };
    }),
  };
}

/** Version demandée par son slug (?version=v2), sinon la plus récente. */
export function pickVersion(
  versions: PublicVersion[],
  slug: string | null | undefined,
): PublicVersion | undefined {
  return versions.find((version) => version.slug === slug) ?? versions.at(-1);
}

/**
 * Comparaison de la maquette : première et dernière version publiées, seulement
 * si chacune a au moins une capture (sinon rien à mettre côte à côte).
 */
export function comparePair(
  versions: PublicVersion[],
): { from: PublicVersion; to: PublicVersion } | null {
  if (versions.length < 2) return null;
  const from = versions[0]!;
  const to = versions.at(-1)!;
  return from.screenshots.length > 0 && to.screenshots.length > 0
    ? { from, to }
    : null;
}
