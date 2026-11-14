export type SkillTechnology = { id: string; name: string };

export type SkillGroup = {
  id: string;
  name: string;
  technologies: SkillTechnology[];
};

export type SkillPillarView = {
  id: string;
  title: string;
  description: string;
  iconKey: string;
};

export type PublicSkills = {
  groups: SkillGroup[];
  pillars: SkillPillarView[];
};

/**
 * Regroupe les compétences par catégorie visible, sans groupe vide. Les
 * technologies sans catégorie mais marquées « compétence » restent visibles
 * dans un groupe « Autres » placé en dernier.
 */
export function buildSkillGroups(
  categories: SkillGroup[],
  uncategorized: SkillTechnology[],
): SkillGroup[] {
  const groups = categories.filter((group) => group.technologies.length > 0);
  if (uncategorized.length > 0) {
    groups.push({
      id: "uncategorized",
      name: "Autres",
      technologies: uncategorized,
    });
  }
  return groups;
}
