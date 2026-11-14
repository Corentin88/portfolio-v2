import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { PUBLIC_CONTENT_TAG } from "@/lib/cache-tags";
import {
  publicProjectWhere,
  publicVersionWhere,
} from "@/features/projects/publication";
import {
  projectCategoryFilters,
  toProjectCard,
  toProjectDetail,
  type ProjectCardData,
  type ProjectCategoryFilter,
  type PublicProjectDetail,
} from "@/features/projects/public-view";

/** Catégories avec leur nombre de projets (tous statuts), pour l'administration. */
export async function listAdminProjectCategories() {
  return db.projectCategory.findMany({
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { projects: true } },
    },
  });
}

export type AdminProjectCategory = Awaited<
  ReturnType<typeof listAdminProjectCategories>
>[number];

export type PublicProjectCatalog = {
  projects: ProjectCardData[];
  categories: ProjectCategoryFilter[];
};

export async function getPublicProjectCatalog(): Promise<PublicProjectCatalog> {
  "use cache";
  cacheTag(PUBLIC_CONTENT_TAG);
  cacheLife("hours");

  const rows = await db.project.findMany({
    where: publicProjectWhere,
    orderBy: { position: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      context: true,
      badgeLabel: true,
      badgeTone: true,
      iconKey: true,
      featured: true,
      category: { select: { name: true, slug: true, position: true } },
      coverMedia: {
        select: { storageKey: true, width: true, height: true, alt: true },
      },
      iconMedia: {
        select: { storageKey: true, width: true, height: true, alt: true },
      },
      versions: {
        where: publicVersionWhere,
        orderBy: { position: "asc" },
        select: {
          label: true,
          technologies: {
            orderBy: { position: "asc" },
            select: { technology: { select: { name: true } } },
          },
        },
      },
    },
  });

  return {
    projects: rows
      .map(toProjectCard)
      .filter((card): card is ProjectCardData => card !== null),
    categories: projectCategoryFilters(rows),
  };
}

const imageSelect = {
  storageKey: true,
  width: true,
  height: true,
  alt: true,
} as const;

/** Slug d'URL plausible : évite une requête (et une entrée de cache) par saisie arbitraire. */
export function isProjectSlug(slug: string): boolean {
  return slug.length <= 140 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/** Fiche publique d'un projet visible, ou null (brouillon, archivé, inconnu). */
export async function getPublicProject(
  slug: string,
): Promise<PublicProjectDetail | null> {
  "use cache";
  cacheTag(PUBLIC_CONTENT_TAG);
  cacheLife("hours");

  if (!isProjectSlug(slug)) return null;

  const row = await db.project.findFirst({
    where: { ...publicProjectWhere, slug },
    select: {
      slug: true,
      title: true,
      summary: true,
      context: true,
      badgeLabel: true,
      badgeTone: true,
      iconKey: true,
      seoTitle: true,
      seoDescription: true,
      category: { select: { name: true, slug: true } },
      coverMedia: { select: imageSelect },
      iconMedia: { select: imageSelect },
      versions: {
        where: publicVersionWhere,
        orderBy: { position: "asc" },
        select: {
          slug: true,
          label: true,
          periodLabel: true,
          releasedAt: true,
          description: true,
          sourceUrl: true,
          demoUrl: true,
          coverMedia: { select: imageSelect },
          highlights: {
            orderBy: { position: "asc" },
            select: { kind: true, text: true },
          },
          challenges: {
            orderBy: { position: "asc" },
            select: { problem: true, solution: true },
          },
          technologies: {
            orderBy: { position: "asc" },
            select: { technology: { select: { name: true } } },
          },
          screenshots: {
            orderBy: { position: "asc" },
            select: {
              alt: true,
              caption: true,
              media: { select: imageSelect },
            },
          },
        },
      },
    },
  });
  return row ? toProjectDetail(row) : null;
}

/** Projets visibles et date de dernière modification, pour sitemap.xml. */
export async function listPublicProjectEntries(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  "use cache";
  cacheTag(PUBLIC_CONTENT_TAG);
  cacheLife("hours");

  return db.project.findMany({
    where: publicProjectWhere,
    orderBy: { position: "asc" },
    select: { slug: true, updatedAt: true },
  });
}

/**
 * Existence d'un projet visible, sans cache. Appelée par proxy.ts avant le rendu :
 * une fois le streaming commencé, un notFound() ne peut plus changer le statut 200.
 */
export async function publicProjectExists(slug: string): Promise<boolean> {
  if (!isProjectSlug(slug)) return false;
  const count = await db.project.count({
    where: { ...publicProjectWhere, slug },
  });
  return count > 0;
}

// ─────────────────────────────── Administration ───────────────────────────────

/** Tous les projets (tous statuts), avec le nombre de versions publiées. */
export async function listAdminProjects() {
  return db.project.findMany({
    orderBy: { position: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      featured: true,
      category: { select: { name: true } },
      versions: { select: { status: true } },
    },
  });
}

export type AdminProjectListItem = Awaited<
  ReturnType<typeof listAdminProjects>
>[number];

const adminImageSelect = { id: true, ...imageSelect } as const;

/** Projet complet pour l'édition (non mis en cache). */
export async function getAdminProject(id: string) {
  return db.project.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      context: true,
      badgeLabel: true,
      badgeTone: true,
      iconKey: true,
      featured: true,
      status: true,
      publishedAt: true,
      archivedAt: true,
      seoTitle: true,
      seoDescription: true,
      categoryId: true,
      iconMediaId: true,
      iconMedia: { select: adminImageSelect },
      coverMedia: { select: adminImageSelect },
      versions: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          slug: true,
          label: true,
          periodLabel: true,
          releasedAt: true,
          description: true,
          sourceUrl: true,
          demoUrl: true,
          status: true,
          publishedAt: true,
          coverMedia: { select: adminImageSelect },
          highlights: {
            orderBy: { position: "asc" },
            select: { kind: true, text: true },
          },
          challenges: {
            orderBy: { position: "asc" },
            select: { id: true, problem: true, solution: true },
          },
          technologies: {
            orderBy: { position: "asc" },
            select: { technologyId: true },
          },
          screenshots: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              alt: true,
              caption: true,
              media: { select: adminImageSelect },
            },
          },
        },
      },
    },
  });
}

export type AdminProject = NonNullable<
  Awaited<ReturnType<typeof getAdminProject>>
>;
export type AdminProjectVersion = AdminProject["versions"][number];

/** Référentiels des formulaires : catégories et technologies. */
export async function listProjectFormOptions() {
  const [categories, technologies] = await Promise.all([
    db.projectCategory.findMany({
      orderBy: { position: "asc" },
      select: { id: true, name: true },
    }),
    db.technology.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { categories, technologies };
}

export type ProjectFormOptions = Awaited<
  ReturnType<typeof listProjectFormOptions>
>;
