import {
  toPublicImage,
  type ImageMedia,
  type PublicImage,
} from "@/features/media/media-view";

export type PublicTimelineEntry = {
  id: string;
  periodLabel: string;
  title: string;
  description: string;
  iconKey: string;
  /** Illustration choisie dans la médiathèque ; null → icône. */
  image: PublicImage | null;
};

export type TimelineRow = Omit<PublicTimelineEntry, "image"> & {
  imageMedia: ImageMedia | null;
};

/** Illustration en miniature (≤ 960 px, ratio conservé) : largement suffisante ici. */
export function toPublicTimelineEntry(row: TimelineRow): PublicTimelineEntry {
  const { imageMedia, ...entry } = row;
  return {
    ...entry,
    image: imageMedia
      ? toPublicImage(imageMedia, { variant: "thumbnail" })
      : null,
  };
}
