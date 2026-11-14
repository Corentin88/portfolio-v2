import { db } from "@/lib/db";
import { DomainError, withDomainErrors } from "@/lib/errors";
import { moveInList, nextPosition } from "@/lib/reorder";
import type { MediaKind } from "@/generated/prisma/enums";
import type {
  ScreenshotTextInput,
  SiteMediaSlot,
} from "@/features/media/schemas";

// Associations entre médias et contenus. Les liens sont en Restrict côté base :
// un média associé ne peut pas être supprimé tant qu'il n'est pas retiré ici.

const KIND_LABEL: Record<MediaKind, string> = {
  IMAGE: "une image",
  DOCUMENT: "un PDF",
};

/** Vérifie qu'un média existe et a le type attendu (image pour une couverture…). */
export async function assertMediaKind(
  mediaId: string,
  kind: MediaKind,
): Promise<void> {
  const media = await db.media.findUnique({
    where: { id: mediaId },
    select: { kind: true },
  });
  if (!media)
    throw new DomainError("Ce média n'existe plus. Rechargez la page.");
  if (media.kind !== kind) {
    throw new DomainError(`Le média choisi doit être ${KIND_LABEL[kind]}.`);
  }
}

export async function setProjectCover(
  projectId: string,
  mediaId: string | null,
): Promise<void> {
  if (mediaId) await assertMediaKind(mediaId, "IMAGE");
  await withDomainErrors(
    db.project.update({
      where: { id: projectId },
      data: { coverMediaId: mediaId },
    }),
    { notFound: "Ce projet n'existe plus. Rechargez la page." },
  );
}

const VERSION_NOT_FOUND = "Cette version n'existe plus. Rechargez la page.";
const SCREENSHOT_NOT_FOUND = "Cette capture n'existe plus. Rechargez la page.";

export async function setVersionCover(
  versionId: string,
  mediaId: string | null,
): Promise<void> {
  if (mediaId) await assertMediaKind(mediaId, "IMAGE");
  await withDomainErrors(
    db.projectVersion.update({
      where: { id: versionId },
      data: { coverMediaId: mediaId },
    }),
    { notFound: VERSION_NOT_FOUND },
  );
}

/** Ajoute une image en fin de galerie d'une version. */
export async function addVersionScreenshot(
  versionId: string,
  mediaId: string,
  text: ScreenshotTextInput,
): Promise<void> {
  await assertMediaKind(mediaId, "IMAGE");
  const { _max } = await db.versionScreenshot.aggregate({
    where: { versionId },
    _max: { position: true },
  });
  await withDomainErrors(
    db.versionScreenshot.create({
      data: {
        versionId,
        mediaId,
        ...text,
        position: nextPosition(_max.position),
      },
    }),
    {
      notFound: VERSION_NOT_FOUND,
      duplicate: "Cette image est déjà dans la galerie de cette version.",
      // Clé étrangère invalide à la création : la version a disparu entre-temps.
      inUse: VERSION_NOT_FOUND,
    },
  );
}

/**
 * Ajout de plusieurs images en fin de galerie, dans l'ordre de sélection. Les
 * images déjà présentes sont ignorées (pas de doublon) ; l'ordre existant est conservé.
 */
export async function addVersionScreenshots(
  versionId: string,
  mediaIds: string[],
): Promise<{ added: number; skipped: number }> {
  const media = await db.media.findMany({
    where: { id: { in: mediaIds } },
    select: { id: true, kind: true },
  });
  const kinds = new Map(media.map((item) => [item.id, item.kind]));
  for (const id of mediaIds) {
    const kind = kinds.get(id);
    if (!kind)
      throw new DomainError(
        "Un média choisi n'existe plus. Rechargez la page.",
      );
    if (kind !== "IMAGE")
      throw new DomainError("Seules des images peuvent rejoindre une galerie.");
  }

  return withDomainErrors(
    db.$transaction(async (tx) => {
      const existing = await tx.versionScreenshot.findMany({
        where: { versionId },
        select: { mediaId: true, position: true },
      });
      const present = new Set(existing.map((shot) => shot.mediaId));
      const toAdd = mediaIds.filter((id) => !present.has(id));
      let position = nextPosition(
        existing.reduce<number | null>(
          (max, shot) =>
            max === null || shot.position > max ? shot.position : max,
          null,
        ),
      );
      for (const mediaId of toAdd) {
        await tx.versionScreenshot.create({
          data: { versionId, mediaId, position },
        });
        position += 1;
      }
      return { added: toAdd.length, skipped: mediaIds.length - toAdd.length };
    }),
    {
      notFound: VERSION_NOT_FOUND,
      duplicate:
        "Une de ces images vient d'être ajoutée à la galerie. Rechargez la page.",
      inUse: VERSION_NOT_FOUND,
    },
  );
}

export async function updateVersionScreenshot(
  id: string,
  text: ScreenshotTextInput,
): Promise<void> {
  await withDomainErrors(
    db.versionScreenshot.update({ where: { id }, data: text }),
    { notFound: SCREENSHOT_NOT_FOUND },
  );
}

/** Retire l'image de la galerie ; le média reste dans la bibliothèque. */
export async function removeVersionScreenshot(id: string): Promise<void> {
  await withDomainErrors(db.versionScreenshot.delete({ where: { id } }), {
    notFound: SCREENSHOT_NOT_FOUND,
  });
}

export async function moveVersionScreenshot(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const screenshot = await db.versionScreenshot.findUnique({
    where: { id },
    select: { versionId: true },
  });
  if (!screenshot) throw new DomainError(SCREENSHOT_NOT_FOUND);

  const siblings = await db.versionScreenshot.findMany({
    where: { versionId: screenshot.versionId },
    select: { id: true, position: true },
  });
  const updates = moveInList(siblings, id, direction);
  if (!updates) return;
  await db.$transaction(
    updates.map(({ id: itemId, position }) =>
      db.versionScreenshot.update({
        where: { id: itemId },
        data: { position },
      }),
    ),
  );
}

const SLOT_KIND: Record<SiteMediaSlot, MediaKind> = {
  cv: "DOCUMENT",
  ogImage: "IMAGE",
  profilePhoto: "IMAGE",
};

const SLOT_COLUMN = {
  cv: "cvMediaId",
  ogImage: "ogImageMediaId",
  profilePhoto: "profilePhotoMediaId",
} as const satisfies Record<SiteMediaSlot, string>;

/** CV (PDF servi par /cv), image de partage ou photo de la carte de visite. */
export async function setSiteMedia(
  slot: SiteMediaSlot,
  mediaId: string | null,
): Promise<void> {
  if (mediaId) await assertMediaKind(mediaId, SLOT_KIND[slot]);
  const data = { [SLOT_COLUMN[slot]]: mediaId };
  await withDomainErrors(db.siteSettings.update({ where: { id: 1 }, data }), {
    notFound:
      "Les réglages du site n'existent pas encore : lancez le seed initial.",
  });
}
