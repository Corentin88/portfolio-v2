import { db } from "@/lib/db";
import { DomainError, withDomainErrors } from "@/lib/errors";
import { moveInList, nextPosition } from "@/lib/reorder";
import {
  statusDates,
  versionWithdrawalError,
} from "@/features/projects/publication";
import type {
  ChallengeInput,
  VersionCreateInput,
  VersionUpdateInput,
} from "@/features/projects/schemas";

const VERSION_MESSAGES = {
  notFound: "Cette version n'existe plus. Rechargez la page.",
  duplicate: "Ce projet a déjà une version avec ce slug (ex. v1, v2).",
  inUse: "Ce projet n'existe plus. Rechargez la page.",
};

const CHALLENGE_MESSAGES = {
  notFound: "Cette difficulté n'existe plus. Rechargez la page.",
  inUse: VERSION_MESSAGES.notFound,
};

/** Nouvelle version en brouillon, ajoutée après les autres. */
export async function createVersion(
  projectId: string,
  input: VersionCreateInput,
): Promise<void> {
  const { _max } = await db.projectVersion.aggregate({
    where: { projectId },
    _max: { position: true },
  });
  await withDomainErrors(
    db.projectVersion.create({
      data: {
        ...input,
        projectId,
        status: "DRAFT",
        position: nextPosition(_max.position),
      },
    }),
    VERSION_MESSAGES,
  );
}

/**
 * Enregistre la version et remplace, dans la même transaction, ses technologies
 * et ses points clés : chaque section du formulaire est une liste complète.
 * Les captures et difficultés, gérées à part, ne sont pas touchées.
 */
export async function updateVersion(
  id: string,
  input: VersionUpdateInput,
): Promise<void> {
  const { technologyIds, features, improvements, status, ...fields } = input;

  if (technologyIds.length > 0) {
    const known = await db.technology.count({
      where: { id: { in: technologyIds } },
    });
    if (known !== technologyIds.length) {
      throw new DomainError(
        "Une technologie choisie n'existe plus. Rechargez la page.",
      );
    }
  }

  await db.$transaction(async (tx) => {
    const current = await tx.projectVersion.findUnique({
      where: { id },
      select: {
        status: true,
        publishedAt: true,
        archivedAt: true,
        projectId: true,
        project: { select: { status: true } },
      },
    });
    if (!current) throw new DomainError(VERSION_MESSAGES.notFound);

    const publishedVersionCount = await tx.projectVersion.count({
      where: { projectId: current.projectId, status: "PUBLISHED" },
    });
    const error = versionWithdrawalError({
      versionStatus: current.status,
      next: status,
      projectStatus: current.project.status,
      publishedVersionCount,
    });
    if (error) throw new DomainError(error);

    await withDomainErrors(
      tx.projectVersion.update({
        where: { id },
        data: { ...fields, status, ...statusDates(current, status) },
      }),
      VERSION_MESSAGES,
    );

    await tx.versionTechnology.deleteMany({ where: { versionId: id } });
    if (technologyIds.length > 0) {
      await tx.versionTechnology.createMany({
        data: technologyIds.map((technologyId, position) => ({
          versionId: id,
          technologyId,
          position,
        })),
      });
    }

    await tx.versionHighlight.deleteMany({ where: { versionId: id } });
    const highlights = [
      ...features.map((text, position) => ({
        kind: "FEATURE" as const,
        text,
        position,
      })),
      ...improvements.map((text, position) => ({
        kind: "IMPROVEMENT" as const,
        text,
        position,
      })),
    ];
    if (highlights.length > 0) {
      await tx.versionHighlight.createMany({
        data: highlights.map((highlight) => ({
          ...highlight,
          versionId: id,
        })),
      });
    }
  });
}

/**
 * Supprime la version avec ses points clés, difficultés et liens de galerie
 * (cascade) ; les images restent dans la bibliothèque. Renvoie son libellé.
 */
export async function deleteVersion(id: string): Promise<string> {
  return db.$transaction(async (tx) => {
    const version = await tx.projectVersion.findUnique({
      where: { id },
      select: {
        label: true,
        status: true,
        projectId: true,
        project: { select: { status: true } },
      },
    });
    if (!version) throw new DomainError(VERSION_MESSAGES.notFound);

    const publishedVersionCount = await tx.projectVersion.count({
      where: { projectId: version.projectId, status: "PUBLISHED" },
    });
    const error = versionWithdrawalError({
      versionStatus: version.status,
      next: "DELETED",
      projectStatus: version.project.status,
      publishedVersionCount,
    });
    if (error) throw new DomainError(error);

    await tx.projectVersion.delete({ where: { id } });
    return version.label;
  });
}

export async function moveVersion(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const version = await db.projectVersion.findUnique({
    where: { id },
    select: { projectId: true },
  });
  if (!version) throw new DomainError(VERSION_MESSAGES.notFound);

  const siblings = await db.projectVersion.findMany({
    where: { projectId: version.projectId },
    select: { id: true, position: true },
  });
  const updates = moveInList(siblings, id, direction);
  if (!updates) return;
  await db.$transaction(
    updates.map(({ id: versionId, position }) =>
      db.projectVersion.update({
        where: { id: versionId },
        data: { position },
      }),
    ),
  );
}

export async function addChallenge(
  versionId: string,
  input: ChallengeInput,
): Promise<void> {
  const { _max } = await db.versionChallenge.aggregate({
    where: { versionId },
    _max: { position: true },
  });
  await withDomainErrors(
    db.versionChallenge.create({
      data: { ...input, versionId, position: nextPosition(_max.position) },
    }),
    CHALLENGE_MESSAGES,
  );
}

export async function updateChallenge(
  id: string,
  input: ChallengeInput,
): Promise<void> {
  await withDomainErrors(
    db.versionChallenge.update({ where: { id }, data: input }),
    CHALLENGE_MESSAGES,
  );
}

export async function deleteChallenge(id: string): Promise<void> {
  await withDomainErrors(
    db.versionChallenge.delete({ where: { id } }),
    CHALLENGE_MESSAGES,
  );
}

export async function moveChallenge(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const challenge = await db.versionChallenge.findUnique({
    where: { id },
    select: { versionId: true },
  });
  if (!challenge) throw new DomainError(CHALLENGE_MESSAGES.notFound);

  const siblings = await db.versionChallenge.findMany({
    where: { versionId: challenge.versionId },
    select: { id: true, position: true },
  });
  const updates = moveInList(siblings, id, direction);
  if (!updates) return;
  await db.$transaction(
    updates.map(({ id: challengeId, position }) =>
      db.versionChallenge.update({
        where: { id: challengeId },
        data: { position },
      }),
    ),
  );
}
