import { describe, expect, it } from "vitest";
import { projectCategorySchema } from "@/features/projects/schemas";
import {
  contactSettingsSchema,
  homeContentSchema,
  seoSettingsSchema,
} from "@/features/site-settings/schemas";
import { skillPillarSchema, technologySchema } from "@/features/skills/schemas";
import { timelineEntrySchema } from "@/features/timeline/schemas";

const home = {
  heroStatusLabel: "Statut",
  heroRoleLine: "Rôle",
  heroTagline: "Accroche",
  heroTaglineSub: "Sous-accroche",
  presentationTitle: "Titre",
  presentationBody: "Paragraphe",
  presentationQuote: "",
};

describe("schémas d'administration", () => {
  it("exige les textes de l'accueil et accepte une citation vide", () => {
    expect(homeContentSchema.parse(home).presentationQuote).toBeNull();
    expect(
      homeContentSchema.safeParse({ ...home, heroTagline: "  " }).success,
    ).toBe(false);
  });

  it("valide l'e-mail et les liens sociaux", () => {
    const valid = contactSettingsSchema.parse({
      contactEmail: " Moi@Domaine.FR ",
      availabilityNote: "",
      linkedinUrl: "",
      githubUrl: "https://github.com/Corentin88",
    });
    expect(valid).toEqual({
      contactEmail: "moi@domaine.fr",
      availabilityNote: null,
      linkedinUrl: null,
      githubUrl: "https://github.com/Corentin88",
    });
    expect(
      contactSettingsSchema.safeParse({
        contactEmail: "pas-un-email",
        availabilityNote: "",
        linkedinUrl: "",
        githubUrl: "",
      }).success,
    ).toBe(false);
  });

  it("respecte les longueurs SEO recommandées", () => {
    expect(
      seoSettingsSchema.safeParse({
        seoTitle: "x".repeat(71),
        seoDescription: "ok",
      }).success,
    ).toBe(false);
  });

  it("n'accepte que les icônes prévues", () => {
    const entry = {
      periodLabel: "2026",
      title: "Titre",
      description: "Texte",
      imageMediaId: "",
      isVisible: "on",
    };
    expect(timelineEntrySchema.parse({ ...entry, iconKey: "alt" })).toEqual({
      ...entry,
      iconKey: "alt",
      imageMediaId: null,
      isVisible: true,
    });
    expect(
      timelineEntrySchema.safeParse({ ...entry, iconKey: "inconnue" }).success,
    ).toBe(false);
    expect(
      skillPillarSchema.safeParse({
        title: "T",
        description: "D",
        iconKey: "rocket",
      }).success,
    ).toBe(false);
  });

  it("traite « sans catégorie » comme null pour une technologie", () => {
    expect(
      technologySchema.parse({ name: "Docker", skillCategoryId: "" }),
    ).toEqual({ name: "Docker", skillCategoryId: null, showInSkills: false });
  });

  it("exige un nom de catégorie de projets", () => {
    expect(projectCategorySchema.safeParse({ name: "" }).success).toBe(false);
  });
});
