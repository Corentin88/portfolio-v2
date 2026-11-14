import { db } from "@/lib/db";
import { DomainError, withDomainErrors } from "@/lib/errors";
import { moveInList, nextPosition } from "@/lib/reorder";
import { slugify } from "@/lib/slug";
import type { SkillCategoryInput } from "@/features/skills/schemas";

const MESSAGES = {
  notFound: "Cette catégorie n'existe plus. Rechargez la page.",
  duplicate: "Une catégorie de compétences porte déjà ce nom.",
};

function categorySlug(name: string): string {
  const slug = slugify(name);
  if (!slug) {
    throw new DomainError(
      "Le nom doit contenir au moins une lettre ou un chiffre.",
    );
  }
  return slug;
}

export async function createSkillCategory(
  input: SkillCategoryInput,
): Promise<void> {
  const { _max } = await db.skillCategory.aggregate({
    _max: { position: true },
  });
  await withDomainErrors(
    db.skillCategory.create({
      data: {
        ...input,
        slug: categorySlug(input.name),
        position: nextPosition(_max.position),
      },
    }),
    MESSAGES,
  );
}

export async function updateSkillCategory(
  id: string,
  input: SkillCategoryInput,
): Promise<void> {
  await withDomainErrors(
    db.skillCategory.update({
      where: { id },
      data: { ...input, slug: categorySlug(input.name) },
    }),
    MESSAGES,
  );
}

/**
 * Suppression autorisée : la base détache ses technologies (SetNull), qui
 * restent visibles dans le groupe « Autres ». Renvoie le nombre de technologies détachées.
 */
export async function deleteSkillCategory(id: string): Promise<number> {
  const detached = await db.technology.count({
    where: { skillCategoryId: id },
  });
  await withDomainErrors(db.skillCategory.delete({ where: { id } }), MESSAGES);
  return detached;
}

export async function moveSkillCategory(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const categories = await db.skillCategory.findMany({
    select: { id: true, position: true },
  });
  const updates = moveInList(categories, id, direction);
  if (!updates) return;
  await db.$transaction(
    updates.map(({ id: categoryId, position }) =>
      db.skillCategory.update({
        where: { id: categoryId },
        data: { position },
      }),
    ),
  );
}
