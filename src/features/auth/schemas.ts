import { z } from "zod";

export const adminEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Adresse e-mail invalide." }).max(254));

export const loginInputSchema = z.object({
  email: adminEmailSchema,
  // Longueur bornée pour éviter de faire hacher des entrées démesurées.
  password: z
    .string()
    .min(1, { error: "Mot de passe requis." })
    .max(128, { error: "Mot de passe trop long." }),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const newAdminPasswordSchema = z
  .string()
  .min(12, { error: "Le mot de passe doit contenir au moins 12 caractères." })
  .max(128, { error: "Le mot de passe ne doit pas dépasser 128 caractères." });
