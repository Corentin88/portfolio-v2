import { describe, expect, it } from "vitest";
import {
  isMediaKey,
  mediaUrl,
  newDocumentKey,
  newImageKey,
  parseRequestedKey,
  storedKeysFor,
  thumbnailKey,
} from "@/lib/media-keys";

const IMAGE = "images/2026/11/0123456789abcdef0123456789abcdef.webp";
const DOCUMENT = "documents/0123456789abcdef0123456789abcdef.pdf";

describe("clés de stockage", () => {
  it("génère des clés valides et non devinables", () => {
    const image = newImageKey(new Date("2026-03-15T12:00:00Z"));
    expect(image).toMatch(/^images\/2026\/03\/[a-f0-9]{32}\.webp$/);
    expect(isMediaKey(image)).toBe(true);
    expect(isMediaKey(newDocumentKey())).toBe(true);
    expect(newDocumentKey()).not.toBe(newDocumentKey());
  });

  it("associe une miniature à chaque image, aucune à un PDF", () => {
    expect(thumbnailKey(IMAGE)).toBe(
      "images/2026/11/0123456789abcdef0123456789abcdef.w960.webp",
    );
    expect(storedKeysFor(IMAGE)).toEqual([IMAGE, thumbnailKey(IMAGE)]);
    expect(storedKeysFor(DOCUMENT)).toEqual([DOCUMENT]);
  });

  it("résout une miniature demandée vers la ligne de son image", () => {
    expect(parseRequestedKey(thumbnailKey(IMAGE))).toEqual({
      storageKey: IMAGE,
      variant: "thumbnail",
    });
    expect(parseRequestedKey(IMAGE)).toEqual({
      storageKey: IMAGE,
      variant: "original",
    });
  });

  it("refuse tout chemin qui n'est pas une clé générée", () => {
    for (const key of [
      "../.env",
      "images/2026/11/../../../.env",
      "images/2026/13/0123456789abcdef0123456789abcdef.webp",
      "images/2026/11/0123456789ABCDEF0123456789ABCDEF.webp",
      "images/2026/11/0123456789abcdef0123456789abcdef.svg",
      "documents/0123456789abcdef0123456789abcdef.pdf.html",
      "documents/0123456789abcdef0123456789abcdef.w960.webp",
      ".tmp/0123456789abcdef0123456789abcdef",
      "",
    ]) {
      expect(parseRequestedKey(key), key).toBeNull();
    }
  });

  it("construit les URL publiques", () => {
    expect(mediaUrl(IMAGE)).toBe(`/media/${IMAGE}`);
    expect(mediaUrl(IMAGE, "thumbnail")).toBe(`/media/${thumbnailKey(IMAGE)}`);
    expect(mediaUrl(DOCUMENT, "thumbnail")).toBe(`/media/${DOCUMENT}`);
  });
});
