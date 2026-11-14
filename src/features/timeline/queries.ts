import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { PUBLIC_CONTENT_TAG } from "@/lib/cache-tags";
import {
  toPublicTimelineEntry,
  type PublicTimelineEntry,
} from "@/features/timeline/public-view";

export type { PublicTimelineEntry };

const imageSelect = {
  storageKey: true,
  width: true,
  height: true,
  alt: true,
} as const;

/** Toutes les étapes, masquées comprises, pour l'administration (non mise en cache). */
export async function listAdminTimeline() {
  return db.timelineEntry.findMany({
    orderBy: { position: "asc" },
    select: {
      id: true,
      periodLabel: true,
      title: true,
      description: true,
      iconKey: true,
      isVisible: true,
      imageMediaId: true,
      imageMedia: { select: { id: true, ...imageSelect } },
    },
  });
}

export type AdminTimelineEntry = Awaited<
  ReturnType<typeof listAdminTimeline>
>[number];

export async function getPublicTimeline(): Promise<PublicTimelineEntry[]> {
  "use cache";
  cacheTag(PUBLIC_CONTENT_TAG);
  cacheLife("hours");

  const rows = await db.timelineEntry.findMany({
    where: { isVisible: true },
    orderBy: { position: "asc" },
    select: {
      id: true,
      periodLabel: true,
      title: true,
      description: true,
      iconKey: true,
      imageMedia: { select: imageSelect },
    },
  });
  return rows.map(toPublicTimelineEntry);
}
