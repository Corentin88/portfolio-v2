import { describe, expect, it } from "vitest";
import { buildSkillGroups } from "@/features/skills/public-view";

describe("buildSkillGroups", () => {
  it("retire les catégories vides et conserve l'ordre", () => {
    const groups = buildSkillGroups(
      [
        {
          id: "a",
          name: "Front-end",
          technologies: [{ id: "t1", name: "React" }],
        },
        { id: "b", name: "Vide", technologies: [] },
        {
          id: "c",
          name: "Back-end",
          technologies: [{ id: "t2", name: "PHP" }],
        },
      ],
      [],
    );
    expect(groups.map((group) => group.name)).toEqual([
      "Front-end",
      "Back-end",
    ]);
  });

  it("ajoute un groupe « Autres » pour les compétences sans catégorie", () => {
    const groups = buildSkillGroups([], [{ id: "t3", name: "n8n" }]);
    expect(groups).toEqual([
      {
        id: "uncategorized",
        name: "Autres",
        technologies: [{ id: "t3", name: "n8n" }],
      },
    ]);
  });
});
