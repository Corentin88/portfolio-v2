import { z } from "zod";
import { optionalHttpUrl, optionalText, requiredText } from "@/lib/validation";

// Longueurs alignées sur les colonnes de site_settings.

export const homeContentSchema = z.object({
  heroStatusLabel: requiredText(120),
  heroRoleLine: requiredText(160),
  heroTagline: requiredText(160),
  heroTaglineSub: requiredText(400),
  presentationTitle: requiredText(120),
  presentationBody: requiredText(10_000),
  presentationQuote: optionalText(300),
});

export const contactSettingsSchema = z.object({
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Adresse e-mail invalide." }).max(254)),
  availabilityNote: optionalText(200),
  linkedinUrl: optionalHttpUrl(),
  githubUrl: optionalHttpUrl(),
});

export const seoSettingsSchema = z.object({
  seoTitle: requiredText(70),
  seoDescription: requiredText(160),
});

export type HomeContentInput = z.output<typeof homeContentSchema>;
export type ContactSettingsInput = z.output<typeof contactSettingsSchema>;
export type SeoSettingsInput = z.output<typeof seoSettingsSchema>;
