import { z } from "zod";
import { checkbox, idList, idSchema, optionalText } from "@/lib/validation";

/** Texte alternatif : vide autorisé ici, obligatoire pour une image (contrôle du service). */
const altText = z
  .string()
  .trim()
  .max(300, { error: "300 caractères maximum." });

/** Sélection facultative d'un média (« aucun » = valeur vide). */
export const optionalMediaId = z
  .string()
  .trim()
  .max(30)
  .transform((value) => value || null);

// Le fichier lui-même n'est pas dans ce schéma : il est lu à part dans le FormData
// puis contrôlé par le service (signature, taille, décodage).
export const uploadMediaSchema = z.object({
  alt: altText,
  useAsCv: checkbox(),
  // Dossier de destination (vide ou absent = « Non classés »).
  folderId: optionalMediaId.optional().transform((value) => value ?? null),
});

/** Nom de dossier : libre, sans barre oblique (réservée à l'affichage du chemin). */
const folderName = z
  .string()
  .trim()
  .min(1, { error: "Nom obligatoire." })
  .max(80, { error: "80 caractères maximum." })
  .refine((value) => !/[/\\\p{Cc}]/u.test(value), {
    error: "Barres obliques et caractères de contrôle interdits.",
  });

export const createFolderSchema = z.object({
  name: folderName,
  parentId: optionalMediaId.optional().transform((value) => value ?? null),
});

export const renameFolderSchema = z.object({ id: idSchema, name: folderName });

export const moveMediaSchema = z.object({
  mediaIds: idList(200).refine((ids) => ids.length > 0, {
    error: "Cochez au moins un média.",
  }),
  folderId: optionalMediaId,
});

/** Ajout de plusieurs images à une galerie (sélecteur multiple). */
export const addScreenshotsSchema = z.object({
  versionId: idSchema,
  mediaIds: idList(100).refine((ids) => ids.length > 0, {
    error: "Choisissez au moins une image.",
  }),
});

export const mediaAltSchema = z.object({ id: idSchema, alt: altText });

export const projectCoverSchema = z.object({
  projectId: idSchema,
  mediaId: optionalMediaId,
});

export const versionCoverSchema = z.object({
  versionId: idSchema,
  mediaId: optionalMediaId,
});

export const addScreenshotSchema = z.object({
  versionId: idSchema,
  mediaId: z.string().trim().min(1, { error: "Choisissez une image." }).max(30),
  alt: optionalText(300),
  caption: optionalText(200),
});

export const updateScreenshotSchema = z.object({
  id: idSchema,
  alt: optionalText(300),
  caption: optionalText(200),
});

export const SITE_MEDIA_SLOTS = ["cv", "ogImage", "profilePhoto"] as const;

export const siteMediaSchema = z.object({
  slot: z.enum(SITE_MEDIA_SLOTS),
  mediaId: optionalMediaId,
});

export type UploadMediaInput = z.output<typeof uploadMediaSchema>;
export type ScreenshotTextInput = Pick<
  z.output<typeof updateScreenshotSchema>,
  "alt" | "caption"
>;
export type SiteMediaSlot = (typeof SITE_MEDIA_SLOTS)[number];
