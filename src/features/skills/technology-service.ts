import { db } from "@/lib/db";
import { DomainError, withDomainErrors } from "@/lib/errors";
import { moveInList, nextPosition } from "@/lib/reorder";
import { slugify } from "@/lib/slug";
import type { TechnologyInput } from "@/features/skills/schemas";

const MESSAGES = {
  notFound: "Cette technologie n'existe plus. Rechargez la page.",
  duplicate: "Une technologie porte déjà ce nom.",
  inUse: "Catégorie de compétences introuvable. Rechargez la page.",
};

function technologySlug(name: string): string {
  const slug = slugify(name);
  if (!slug) {
    throw new DomainError(
      "Le nom doit contenir au moins une lettre ou un chiffre.",
    );
  }
  return slug;
}

/** Position en fin de la catégorie : l'ordre est propre à chaque catégorie. */
async function endOfCategory(skillCategoryId: string | null): Promise<number> {
  const { _max } = await db.technology.aggregate({
    where: { skillCategoryId },
    _max: { skillPosition: true },
  });
  return nextPosition(_max.skillPosition);
}

export async function createTechnology(input: TechnologyInput): Promise<void> {
  await withDomainErrors(
    db.technology.create({
      data: {
        ...input,
        slug: technologySlug(input.name),
        skillPosition: await endOfCategory(input.skillCategoryId),
      },
    }),
    MESSAGES,
  );
}

export async function updateTechnology(
  id: string,
  input: TechnologyInput,
): Promise<void> {
  const current = await db.technology.findUnique({
    where: { id },
    select: { skillCategoryId: true },
  });
  if (!current) throw new DomainError(MESSAGES.notFound);

  const categoryChanged = current.skillCategoryId !== input.skillCategoryId;
  await withDomainErrors(
    db.technology.update({
      where: { id },
      data: {
        ...input,
        slug: technologySlug(input.name),
        ...(categoryChanged && {
          skillPosition: await endOfCategory(input.skillCategoryId),
        }),
      },
    }),
    MESSAGES,
  );
}

/** Refusée si la technologie est utilisée par une version de projet (Restrict). */
export async function deleteTechnology(id: string): Promise<void> {
  const usages = await db.versionTechnology.count({
    where: { technologyId: id },
  });
  if (usages > 0) {
    throw new DomainError(
      `Technologie utilisée par ${usages} version(s) de projet : retirez-la d'abord de ces versions.`,
    );
  }
  await withDomainErrors(db.technology.delete({ where: { id } }), {
    notFound: MESSAGES.notFound,
    inUse: "Technologie encore utilisée par un projet.",
  });
}

export async function moveTechnology(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const current = await db.technology.findUnique({
    where: { id },
    select: { skillCategoryId: true },
  });
  if (!current) throw new DomainError(MESSAGES.notFound);

  const siblings = await db.technology.findMany({
    where: { skillCategoryId: current.skillCategoryId },
    select: { id: true, skillPosition: true },
  });
  const updates = moveInList(
    siblings.map((item) => ({ id: item.id, position: item.skillPosition })),
    id,
    direction,
  );
  if (!updates) return;
  await db.$transaction(
    updates.map(({ id: technologyId, position }) =>
      db.technology.update({
        where: { id: technologyId },
        data: { skillPosition: position },
      }),
    ),
  );
}
