import { describe, expect, it } from "vitest";
import { toPublicTimelineEntry } from "@/features/timeline/public-view";

const row = {
  id: "t1",
  periodLabel: "2024",
  title: "Formation Alt",
  description: "Texte",
  iconKey: "alt",
};

describe("toPublicTimelineEntry", () => {
  it("garde l'icône comme repli sans illustration", () => {
    expect(toPublicTimelineEntry({ ...row, imageMedia: null })).toEqual({
      ...row,
      image: null,
    });
  });

  it("expose l'illustration en miniature, ratio conservé", () => {
    const entry = toPublicTimelineEntry({
      ...row,
      imageMedia: {
        storageKey: `images/2026/11/${"a".repeat(32)}.webp`,
        width: 1600,
        height: 400,
        alt: "Logo de l'école Alt",
      },
    });
    expect(entry.image).toMatchObject({
      width: 960,
      height: 240,
      alt: "Logo de l'école Alt",
    });
  });

  it("ignore une image sans dimensions connues", () => {
    const entry = toPublicTimelineEntry({
      ...row,
      imageMedia: {
        storageKey: `images/2026/11/${"a".repeat(32)}.webp`,
        width: null,
        height: null,
        alt: "Logo",
      },
    });
    expect(entry.image).toBeNull();
  });
});
