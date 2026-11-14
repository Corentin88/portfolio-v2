import { z } from "zod";
import { optionalMediaId } from "@/features/media/schemas";
import { BADGE_TONES } from "@/features/projects/badge-tones";
import { PROJECT_ICON_KEYS } from "@/features/projects/icons";
import {
  checkbox,
  idList,
  idSchema,
  lineList,
  optionalDate,
  optionalHttpUrl,
  optionalText,
  requiredText,
} from "@/lib/validation";

export const projectCategorySchema = z.object({ name: requiredText(60) });

export const projectCategoryUpdateSchema = projectCategorySchema.extend({
  id: idSchema,
});

export type ProjectCategoryInput = z.output<typeof projectCategorySchema>;

export const CONTENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type ContentStatusValue = (typeof CONTENT_STATUSES)[number];

export const STATUS_OPTIONS: ReadonlyArray<{
  value: ContentStatusValue;
  label: string;
}> = [
  { value: "DRAFT", label: "Brouillon (invisible)" },
  { value: "PUBLISHED", label: "Publié" },
  { value: "ARCHIVED", label: "Archivé (invisible)" },
];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Slug saisi (facultatif : vide → dérivé du titre par le service). */
function slugField(max: number) {
  return z
    .string()
    .trim()
    .toLowerCase()
    .max(max, { error: `${max} caractères maximum.` })
    .refine((value) => value === "" || SLUG_PATTERN.test(value), {
      error:
        "Lettres minuscules, chiffres et tirets uniquement (ex. mon-projet).",
    });
}

const projectFields = {
  title: requiredText(120),
  slug: slugField(140),
  summary: requiredText(400),
  context: optionalText(120),
  badgeLabel: optionalText(40),
  badgeTone: z.enum(BADGE_TONES, { error: "Couleur de badge inconnue." }),
  iconKey: z.enum(PROJECT_ICON_KEYS, { error: "Icône inconnue." }),
  // Logo importé (médiathèque) : prioritaire sur l'icône du catalogue.
  iconMediaId: optionalMediaId,
  featured: checkbox(),
  categoryId: z
    .string()
    .trim()
    .min(1, { error: "Choisissez une catégorie." })
    .max(30),
  seoTitle: optionalText(70),
  seoDescription: optionalText(160),
};

export const projectCreateSchema = z.object(projectFields);

export const projectUpdateSchema = z.object({
  ...projectFields,
  id: idSchema,
  status: z.enum(CONTENT_STATUSES, { error: "Statut inconnu." }),
});

export type ProjectCreateInput = z.output<typeof projectCreateSchema>;
export type ProjectUpdateInput = Omit<
  z.output<typeof projectUpdateSchema>,
  "id"
>;

const versionFields = {
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: "Champ obligatoire (ex. v1)." })
    .max(20, { error: "20 caractères maximum." })
    .refine((value) => SLUG_PATTERN.test(value), {
      error: "Lettres minuscules, chiffres et tirets uniquement (ex. v2).",
    }),
  label: requiredText(60),
  periodLabel: optionalText(80),
  releasedAt: optionalDate(),
  description: requiredText(5000),
  sourceUrl: optionalHttpUrl(),
  demoUrl: optionalHttpUrl(),
};

export const versionCreateSchema = z.object({
  ...versionFields,
  projectId: idSchema,
});

export const versionUpdateSchema = z.object({
  ...versionFields,
  id: idSchema,
  status: z.enum(CONTENT_STATUSES, { error: "Statut inconnu." }),
  technologyIds: idList(40),
  features: lineList(30, 300),
  improvements: lineList(30, 300),
});

export type VersionCreateInput = Omit<
  z.output<typeof versionCreateSchema>,
  "projectId"
>;
export type VersionUpdateInput = Omit<
  z.output<typeof versionUpdateSchema>,
  "id"
>;

const challengeFields = {
  problem: requiredText(2000),
  solution: requiredText(2000),
};

export const challengeCreateSchema = z.object({
  ...challengeFields,
  versionId: idSchema,
});

export const challengeUpdateSchema = z.object({
  ...challengeFields,
  id: idSchema,
});

export type ChallengeInput = z.output<z.ZodObject<typeof challengeFields>>;
