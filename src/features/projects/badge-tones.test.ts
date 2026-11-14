import { describe, expect, it } from "vitest";
import {
  BADGE_ON_DARK,
  BADGE_ON_SURFACE,
  BADGE_TONES,
  badgePulses,
  toBadgeTone,
} from "@/features/projects/badge-tones";

describe("variantes de badge", () => {
  it("garde l'ambre par défaut pour les badges existants ou une valeur inconnue", () => {
    expect(toBadgeTone(null)).toBe("warning");
    expect(toBadgeTone("")).toBe("warning");
    expect(toBadgeTone("violet")).toBe("warning");
    expect(toBadgeTone("danger")).toBe("danger");
  });

  it("définit un rendu pour chaque variante, dans les deux contextes", () => {
    for (const tone of BADGE_TONES) {
      expect(BADGE_ON_DARK[tone].text).toBeTruthy();
      expect(BADGE_ON_SURFACE[tone].text).toBeTruthy();
    }
  });

  it("adapte la couleur du texte au thème sombre sur fond de page", () => {
    for (const tone of BADGE_TONES) {
      if (tone === "warning") continue; // amber-brand change déjà de valeur avec le thème
      expect(BADGE_ON_SURFACE[tone].text).toMatch(/dark:/);
    }
  });

  it("ne fait pulser que les états « en cours » (aucune surveillance simulée)", () => {
    expect(BADGE_TONES.filter(badgePulses)).toEqual(["warning", "info"]);
  });
});
