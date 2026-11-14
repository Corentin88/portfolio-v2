import { z } from "zod";
import { PILLAR_ICON_KEYS } from "@/features/skills/icons";
import { checkbox, idSchema, requiredText } from "@/lib/validation";

export const technologySchema = z.object({
  name: requiredText(60),
  // Liste déroulante : chaîne vide = « sans catégorie ».
  skillCategoryId: z
    .string()
    .trim()
    .max(30)
    .transform((value) => value || null),
  showInSkills: checkbox(),
});

export const skillCategorySchema = z.object({
  name: requiredText(60),
  isVisible: checkbox(),
});

export const skillPillarSchema = z.object({
  title: requiredText(80),
  description: requiredText(300),
  iconKey: z.enum(PILLAR_ICON_KEYS, { error: "Icône inconnue." }),
  isVisible: checkbox(),
});

export const technologyUpdateSchema = technologySchema.extend({ id: idSchema });
export const skillCategoryUpdateSchema = skillCategorySchema.extend({
  id: idSchema,
});
export const skillPillarUpdateSchema = skillPillarSchema.extend({
  id: idSchema,
});

export type TechnologyInput = z.output<typeof technologySchema>;
export type SkillCategoryInput = z.output<typeof skillCategorySchema>;
export type SkillPillarInput = z.output<typeof skillPillarSchema>;
