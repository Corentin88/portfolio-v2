import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Les Server Actions (base, session, cache) sont remplacées : seul le rendu est testé.
// vi.mock est remonté en tête de fichier : l'utilitaire doit l'être aussi (vi.hoisted).
const actions = vi.hoisted(
  () =>
    (...names: string[]) =>
      Object.fromEntries(names.map((name) => [name, () => null])),
);
vi.mock("@/features/projects/actions", () =>
  actions(
    "addChallengeAction",
    "deleteChallengeAction",
    "deleteVersionAction",
    "moveChallengeAction",
    "moveVersionAction",
    "updateChallengeAction",
    "updateVersionAction",
  ),
);
vi.mock("@/features/media/actions", () =>
  actions(
    "addVersionScreenshotsAction",
    "uploadMediaFromPickerAction",
    "moveVersionScreenshotAction",
    "removeVersionScreenshotAction",
    "setProjectCoverAction",
    "setVersionCoverAction",
    "updateVersionScreenshotAction",
  ),
);

import * as projectMediaAdmin from "@/features/media/components/admin/project-media-admin";
import { VersionEditor } from "@/features/projects/components/admin/version-editor";
import type { AdminProjectVersion } from "@/features/projects/queries";

const image = {
  id: "m1",
  storageKey: `images/2026/11/${"a".repeat(32)}.webp`,
  width: 1600,
  height: 900,
  alt: "Accueil de MonFluxRSS",
};

const version: AdminProjectVersion = {
  id: "ver1",
  slug: "v1",
  label: "V1",
  periodLabel: null,
  releasedAt: null,
  description: "Première version.",
  sourceUrl: "https://github.com/compte/projet",
  demoUrl: null,
  status: "DRAFT",
  publishedAt: null,
  coverMedia: null,
  highlights: [{ kind: "FEATURE", text: "Lecture des flux" }],
  challenges: [],
  technologies: [{ technologyId: "t1" }],
  screenshots: [{ id: "s1", alt: null, caption: null, media: image }],
};

describe("VersionEditor", () => {
  it("dispose de VersionMedia exporté par l'administration des médias", () => {
    // Non-régression : un export manquant donnait « Element type is invalid … got: undefined ».
    expect(typeof projectMediaAdmin.VersionMedia).toBe("function");
  });

  it("rend une version avec sa section couverture et captures", () => {
    const html = renderToStaticMarkup(
      createElement(
        "ol",
        null,
        createElement(VersionEditor, {
          version,
          project: { coverMedia: null },
          isFirst: true,
          isLast: true,
          technologies: [{ id: "t1", name: "PHP" }],
        }),
      ),
    );

    expect(html).toContain("Couverture et captures (1)");
    expect(html).toContain("Couverture de la version");
    expect(html).toContain("Galerie (1)");
    expect(html).toContain("Lecture des flux");
    expect(html).toContain("https://github.com/compte/projet");
  });
});
