import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { PUBLIC_CONTENT_TAG } from "@/lib/cache-tags";
import {
  buildSkillGroups,
  type PublicSkills,
} from "@/features/skills/public-view";

const skillTechnologySelect = { id: true, name: true } as const;

// ── Lectures d'administration (non mises en cache, éléments masqués compris) ──

export async function listAdminSkillCategories() {
  return db.skillCategory.findMany({
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      isVisible: true,
      _count: { select: { technologies: true } },
    },
  });
}

export async function listAdminTechnologies() {
  return db.technology.findMany({
    orderBy: [{ skillCategory: { position: "asc" } }, { skillPosition: "asc" }],
    select: {
      id: true,
      name: true,
      showInSkills: true,
      skillCategoryId: true,
      skillCategory: { select: { name: true } },
      _count: { select: { versions: true } },
    },
  });
}

export async function listAdminSkillPillars() {
  return db.skillPillar.findMany({
    orderBy: { position: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      iconKey: true,
      isVisible: true,
    },
  });
}

export type AdminSkillCategory = Awaited<
  ReturnType<typeof listAdminSkillCategories>
>[number];
export type AdminTechnology = Awaited<
  ReturnType<typeof listAdminTechnologies>
>[number];
export type AdminSkillPillar = Awaited<
  ReturnType<typeof listAdminSkillPillars>
>[number];

export async function getPublicSkills(): Promise<PublicSkills> {
  "use cache";
  cacheTag(PUBLIC_CONTENT_TAG);
  cacheLife("hours");

  const [categories, uncategorized, pillars] = await Promise.all([
    db.skillCategory.findMany({
      where: { isVisible: true },
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
        technologies: {
          where: { showInSkills: true },
          orderBy: { skillPosition: "asc" },
          select: skillTechnologySelect,
        },
      },
    }),
    db.technology.findMany({
      where: { showInSkills: true, skillCategoryId: null },
      orderBy: { skillPosition: "asc" },
      select: skillTechnologySelect,
    }),
    db.skillPillar.findMany({
      where: { isVisible: true },
      orderBy: { position: "asc" },
      select: { id: true, title: true, description: true, iconKey: true },
    }),
  ]);

  return { groups: buildSkillGroups(categories, uncategorized), pillars };
}
