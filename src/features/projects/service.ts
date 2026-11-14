import { db } from "@/lib/db";
import { DomainError, withDomainErrors } from "@/lib/errors";
import { moveInList, nextPosition } from "@/lib/reorder";
import { slugify } from "@/lib/slug";
import { assertMediaKind } from "@/features/media/link-service";
import {
  projectDeletionError,
  projectStatusError,
  statusDates,
} from "@/features/projects/publication";
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
} from "@/features/projects/schemas";

export const PROJECT_MESSAGES = {
  notFound: "Ce projet n'existe plus. Rechargez la page.",
  duplicate: "Un autre projet utilise déjà ce slug : choisissez-en un autre.",
  // Clé étrangère invalide : la catégorie choisie a été supprimée entre-temps.
  inUse: "La catégorie choisie n'existe plus. Rechargez la page.",
};

/** Slug saisi, sinon dérivé du titre. */
function projectSlug(slug: string, title: string): string {
  const value = slug || slugify(title, 140);
  if (!value) {
    throw new DomainError(
      "Le titre doit contenir au moins une lettre ou un chiffre.",
    );
  }
  return value;
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  const category = await db.projectCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new DomainError("La catégorie choisie n'existe plus.");
  }
}

/** Nouveau projet, toujours en brouillon et en fin de liste. Renvoie son id. */
export async function createProject(
  input: ProjectCreateInput,
): Promise<string> {
  await assertCategoryExists(input.categoryId);
  if (input.iconMediaId) await assertMediaKind(input.iconMediaId, "IMAGE");
  const { _max } = await db.project.aggregate({ _max: { position: true } });
  const { slug, ...fields } = input;
  const project = await withDomainErrors(
    db.project.create({
      data: {
        ...fields,
        slug: projectSlug(slug, input.title),
        status: "DRAFT",
        position: nextPosition(_max.position),
      },
      select: { id: true },
    }),
    PROJECT_MESSAGES,
  );
  return project.id;
}

/**
 * Mise à jour des champs du projet. Le statut obéit aux règles de publication,
 * vérifiées dans la même transaction que l'écriture.
 */
export async function updateProject(
  id: string,
  input: ProjectUpdateInput,
): Promise<void> {
  await assertCategoryExists(input.categoryId);
  if (input.iconMediaId) await assertMediaKind(input.iconMediaId, "IMAGE");
  const { slug, status, ...fields } = input;

  await db.$transaction(async (tx) => {
    const current = await tx.project.findUnique({
      where: { id },
      select: {
        status: true,
        publishedAt: true,
        archivedAt: true,
        _count: {
          select: { versions: { where: { status: "PUBLISHED" } } },
        },
      },
    });
    if (!current) throw new DomainError(PROJECT_MESSAGES.notFound);

    const error = projectStatusError(status, current._count.versions);
    if (error) throw new DomainError(error);

    await withDomainErrors(
      tx.project.update({
        where: { id },
        data: {
          ...fields,
          slug: projectSlug(slug, input.title),
          status,
          ...statusDates(current, status),
        },
      }),
      PROJECT_MESSAGES,
    );
  });
}

/**
 * Supprime le projet et, par cascade, ses versions, points clés, difficultés et
 * liens de galerie. Les fichiers restent dans la bibliothèque de médias.
 */
export async function deleteProject(id: string): Promise<string> {
  const project = await db.project.findUnique({
    where: { id },
    select: { title: true, status: true },
  });
  if (!project) throw new DomainError(PROJECT_MESSAGES.notFound);
  const error = projectDeletionError(project.status);
  if (error) throw new DomainError(error);

  await withDomainErrors(
    db.project.delete({ where: { id } }),
    PROJECT_MESSAGES,
  );
  return project.title;
}

export async function moveProject(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const projects = await db.project.findMany({
    select: { id: true, position: true },
  });
  const updates = moveInList(projects, id, direction);
  if (!updates) return;
  await db.$transaction(
    updates.map(({ id: projectId, position }) =>
      db.project.update({ where: { id: projectId }, data: { position } }),
    ),
  );
}
