import { describe, expect, it } from "vitest";
import {
  describeUsages,
  formatBytes,
  isPubliclyAccessible,
  resolveVersionCover,
  toGalleryImages,
  toPublicImage,
  type ImageMedia,
} from "@/features/media/media-view";

const media = (name: string, alt = `alt ${name}`): ImageMedia => ({
  storageKey: `images/2026/11/${name.padEnd(32, "0")}.webp`,
  width: 2400,
  height: 1200,
  alt,
});

const noUsage = {
  projectCovers: 0,
  projectIcons: 0,
  versionCovers: 0,
  screenshots: 0,
  settingsAsCv: 0,
  settingsAsOgImage: 0,
  settingsAsProfile: 0,
  timelineEntries: 0,
};

describe("isPubliclyAccessible", () => {
  it("garde privé un média non utilisé ou lié seulement à un brouillon", () => {
    expect(isPubliclyAccessible(noUsage)).toBe(false);
  });

  it("rend public un média rattaché à un contenu publié", () => {
    expect(isPubliclyAccessible({ ...noUsage, screenshots: 1 })).toBe(true);
    expect(isPubliclyAccessible({ ...noUsage, settingsAsCv: 1 })).toBe(true);
  });

  it("rend publics la photo de profil, les logos et les illustrations de timeline", () => {
    expect(isPubliclyAccessible({ ...noUsage, settingsAsProfile: 1 })).toBe(
      true,
    );
    expect(isPubliclyAccessible({ ...noUsage, projectIcons: 1 })).toBe(true);
    expect(isPubliclyAccessible({ ...noUsage, timelineEntries: 1 })).toBe(true);
  });
});

describe("describeUsages", () => {
  it("liste tous les usages", () => {
    expect(
      describeUsages({
        projectCovers: [{ title: "Météo" }],
        projectIcons: [{ title: "Météo" }],
        versionCovers: [],
        screenshots: [
          { version: { label: "V2", project: { title: "Météo" } } },
        ],
        settingsAsCv: [],
        settingsAsOgImage: [{ id: 1 }],
        settingsAsProfile: [{ id: 1 }],
        timelineEntries: [{ title: "Formation Alt" }],
      }),
    ).toEqual([
      "couverture du projet « Météo »",
      "logo du projet « Météo »",
      "galerie de « Météo » (V2)",
      "image de partage du site",
      "photo de la carte de visite",
      "illustration de l'étape « Formation Alt »",
    ]);
  });
});

describe("toPublicImage", () => {
  it("calcule les dimensions de la miniature", () => {
    expect(toPublicImage(media("a"), { variant: "thumbnail" })).toMatchObject({
      src: expect.stringMatching(/\.w960\.webp$/),
      width: 960,
      height: 480,
    });
  });

  it("ignore une image sans dimensions", () => {
    expect(toPublicImage({ ...media("a"), width: null })).toBeNull();
  });
});

describe("toGalleryImages", () => {
  it("donne la priorité au texte alternatif de la capture", () => {
    const [first, second] = toGalleryImages([
      { alt: "  Écran d'accueil ", caption: " Accueil ", media: media("a") },
      { alt: null, caption: "", media: media("b") },
    ]);
    expect(first).toMatchObject({
      alt: "Écran d'accueil",
      caption: "Accueil",
    });
    expect(second).toMatchObject({ alt: "alt b", caption: null });
  });
});

describe("resolveVersionCover", () => {
  const shot = { alt: "capture", caption: null, media: media("s") };

  it("suit l'ordre version → 1re capture → projet → générée", () => {
    expect(
      resolveVersionCover({
        versionCover: media("v"),
        screenshots: [shot],
        projectCover: media("p"),
      }).source,
    ).toBe("version");
    expect(
      resolveVersionCover({
        versionCover: null,
        screenshots: [shot],
        projectCover: media("p"),
      }),
    ).toMatchObject({ source: "screenshot", image: { alt: "capture" } });
    expect(
      resolveVersionCover({
        versionCover: null,
        screenshots: [],
        projectCover: media("p"),
      }).source,
    ).toBe("project");
    expect(
      resolveVersionCover({
        versionCover: null,
        screenshots: [],
        projectCover: null,
      }),
    ).toEqual({ source: "generated", image: null });
  });
});

describe("formatBytes", () => {
  it("affiche des tailles lisibles", () => {
    expect(formatBytes(512)).toBe("512 o");
    expect(formatBytes(2048)).toBe("2 Ko");
    expect(formatBytes(3.5 * 1024 * 1024)).toBe("3,5 Mo");
  });
});
