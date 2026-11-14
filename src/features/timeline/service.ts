import { db } from "@/lib/db";
import { withDomainErrors } from "@/lib/errors";
import { assertMediaKind } from "@/features/media/link-service";
import { moveInList, nextPosition } from "@/lib/reorder";
import type { TimelineEntryInput } from "@/features/timeline/schemas";

const MESSAGES = { notFound: "Cette étape n'existe plus. Rechargez la page." };

/** Nouvelle étape ajoutée en fin de liste. */
export async function createTimelineEntry(
  input: TimelineEntryInput,
): Promise<void> {
  if (input.imageMediaId) await assertMediaKind(input.imageMediaId, "IMAGE");
  const { _max } = await db.timelineEntry.aggregate({
    _max: { position: true },
  });
  await db.timelineEntry.create({
    data: { ...input, position: nextPosition(_max.position) },
  });
}

export async function updateTimelineEntry(
  id: string,
  input: TimelineEntryInput,
): Promise<void> {
  if (input.imageMediaId) await assertMediaKind(input.imageMediaId, "IMAGE");
  await withDomainErrors(
    db.timelineEntry.update({ where: { id }, data: input }),
    MESSAGES,
  );
}

export async function deleteTimelineEntry(id: string): Promise<void> {
  await withDomainErrors(db.timelineEntry.delete({ where: { id } }), MESSAGES);
}

export async function moveTimelineEntry(
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const entries = await db.timelineEntry.findMany({
    select: { id: true, position: true },
  });
  const updates = moveInList(entries, id, direction);
  if (!updates) return;
  await db.$transaction(
    updates.map(({ id: entryId, position }) =>
      db.timelineEntry.update({ where: { id: entryId }, data: { position } }),
    ),
  );
}
