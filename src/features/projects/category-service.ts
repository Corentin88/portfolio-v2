import { db } from "@/lib/db";
import { DomainError, withDomainErrors } from "@/lib/errors";
import { moveInList, nextPosition } from "@/lib/reorder";
import { slugify } from "@/lib/slug";
import type { ProjectCategoryInput } from "@/features/projects/schemas";

const MESSAGES = {
  notFound: "Cette catégorie n'existe plus. Rechargez la page.",
  duplicate: "Une catégorie de projets porte déjà ce nom.",
  inUse: "Catégorie encore utilisée par un projet.",
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

export async function createProjectCategory(
  input: ProjectCategoryInput,
): Promise<void> {
  const { _max } = await db.projectCategory.aggregate({
    _max: { position: true },
  });
  await withDomainErrors(
    db.projectCategory.create({
      data: {
        name: input.name,
        slug: categorySlug(input.name),
        position: nextPosition(_max.position),
      },
    }),
    MESSAGES,
  );
}

export async function updateProjectCategory(
  id: string,
  input: ProjectCategoryInput,
): Promise<void> {
  await withDomainErrors(
    db.projectCategory.update({
      where: { id },
      data: { name: input.name, slug: categorySlug(input.name) },
    }),
    MESSAGES,
  );
}

/**
 * Refusée tant qu'un projet, même brouillon ou archivé, utilise la catégorie :
 * la base l'interdit aussi (Restrict), on prévient avec un message explicite.
 */
export async function deleteProjectCategory(id: string): Promise<void> {
  const projects = await db.project.count({ where: { categoryId: id } });
  if (projects > 0) {
    throw new DomainError(
      `Catégorie utilisée par ${projects} projet(s) : changez leur catégorie avant de la supprimer.`,
    );
  }
  await withDomainErrors(
    db.projectCategory.delete({ where: { id } }),
    MESSAGES,
  );
}

export async function moveProjectCategory(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const categories = await db.projectCategory.findMany({
    select: { id: true, position: true },
  });
  const updates = moveInList(categories, id, direction);
  if (!updates) return;
  await db.$transaction(
    updates.map(({ id: categoryId, position }) =>
      db.projectCategory.update({
        where: { id: categoryId },
        data: { position },
      }),
    ),
  );
}
