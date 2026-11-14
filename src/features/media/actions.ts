"use server";

import { runAdminAction } from "@/features/auth/admin-action";
import {
  createFolder,
  deleteFolder,
  moveMediaToFolder,
  renameFolder,
} from "@/features/media/folder-service";
import { toPickerMedia, type PickerMedia } from "@/features/media/picker";
import { getMediaPreview } from "@/features/media/queries";
import {
  addVersionScreenshot,
  addVersionScreenshots,
  moveVersionScreenshot,
  removeVersionScreenshot,
  setProjectCover,
  setSiteMedia,
  setVersionCover,
  updateVersionScreenshot,
} from "@/features/media/link-service";
import {
  addScreenshotSchema,
  addScreenshotsSchema,
  createFolderSchema,
  moveMediaSchema,
  renameFolderSchema,
  mediaAltSchema,
  projectCoverSchema,
  siteMediaSchema,
  updateScreenshotSchema,
  uploadMediaSchema,
  versionCoverSchema,
} from "@/features/media/schemas";
import {
  deleteMedia,
  updateMediaAlt,
  uploadMedia,
} from "@/features/media/service";
import { requireAdmin } from "@/features/auth/require-admin";
import type { ActionState } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import { formDataToObject } from "@/lib/validation";
import { deleteSchema, moveSchema } from "@/lib/validation";

export async function uploadMediaAction(
  _previous: ActionState,
  formData: FormData,
) {
  // runAdminAction vérifie la session avant toute lecture du fichier.
  return runAdminAction(uploadMediaSchema, formData, async (data) => {
    const file = formData.get("file");
    const { kind } = await uploadMedia(
      file instanceof File ? file : null,
      data,
    );
    if (data.useAsCv) return "PDF ajouté et défini comme CV du site.";
    return kind === "IMAGE"
      ? "Image ajoutée à la bibliothèque."
      : "PDF ajouté à la bibliothèque.";
  });
}

export type PickerUploadResult =
  { ok: true; media: PickerMedia } | { ok: false; error: string };

/**
 * Import depuis le sélecteur : même service et mêmes contrôles que la médiathèque,
 * mais renvoie le média créé pour le présélectionner. Aucune association n'est
 * créée ici ; le formulaire parent reste maître de l'enregistrement.
 */
export async function uploadMediaFromPickerAction(
  formData: FormData,
): Promise<PickerUploadResult> {
  await requireAdmin();
  const parsed = uploadMediaSchema.safeParse({
    ...formDataToObject(formData),
    useAsCv: undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Envoi invalide.",
    };
  }
  try {
    const file = formData.get("file");
    const { id } = await uploadMedia(
      file instanceof File ? file : null,
      parsed.data,
    );
    const row = await getMediaPreview(id);
    if (!row) return { ok: false, error: "Média introuvable après l'envoi." };
    return { ok: true, media: toPickerMedia(row) };
  } catch (error) {
    if (error instanceof DomainError)
      return { ok: false, error: error.message };
    throw error;
  }
}

export async function createFolderAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    createFolderSchema,
    formData,
    async ({ name, parentId }) => {
      await createFolder(name, parentId);
      return `Dossier « ${name} » créé.`;
    },
    { invalidatePublic: false },
  );
}

export async function renameFolderAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    renameFolderSchema,
    formData,
    async ({ id, name }) => {
      await renameFolder(id, name);
      return `Dossier renommé en « ${name} ».`;
    },
    { invalidatePublic: false },
  );
}

export async function deleteFolderAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    deleteSchema,
    formData,
    async ({ id }) => {
      await deleteFolder(id);
      return "Dossier supprimé.";
    },
    { invalidatePublic: false },
  );
}

export async function moveMediaAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    moveMediaSchema,
    formData,
    async ({ mediaIds, folderId }) => {
      const count = await moveMediaToFolder(mediaIds, folderId);
      return `${count} média(s) déplacé(s) ${folderId ? "dans le dossier choisi" : "vers « Non classés »"}.`;
    },
    // Rangement purement logique : rien ne change côté public.
    { invalidatePublic: false },
  );
}

export async function addVersionScreenshotsAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    addScreenshotsSchema,
    formData,
    async ({ versionId, mediaIds }) => {
      const { added, skipped } = await addVersionScreenshots(
        versionId,
        mediaIds,
      );
      return skipped > 0
        ? `${added} image(s) ajoutée(s) ; ${skipped} déjà dans la galerie.`
        : `${added} image(s) ajoutée(s) à la galerie.`;
    },
  );
}

export async function updateMediaAltAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(mediaAltSchema, formData, async ({ id, alt }) => {
    await updateMediaAlt(id, alt);
    return "Texte alternatif enregistré.";
  });
}

export async function deleteMediaAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(deleteSchema, formData, async ({ id }) => {
    await deleteMedia(id);
    return "Média supprimé.";
  });
}

export async function setProjectCoverAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    projectCoverSchema,
    formData,
    async ({ projectId, mediaId }) => {
      await setProjectCover(projectId, mediaId);
      return mediaId
        ? "Couverture du projet enregistrée."
        : "Couverture retirée.";
    },
  );
}

export async function setVersionCoverAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    versionCoverSchema,
    formData,
    async ({ versionId, mediaId }) => {
      await setVersionCover(versionId, mediaId);
      return mediaId
        ? "Couverture de la version enregistrée."
        : "Couverture retirée.";
    },
  );
}

export async function addVersionScreenshotAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    addScreenshotSchema,
    formData,
    async ({ versionId, mediaId, ...text }) => {
      await addVersionScreenshot(versionId, mediaId, text);
      return "Image ajoutée à la galerie.";
    },
  );
}

export async function updateVersionScreenshotAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    updateScreenshotSchema,
    formData,
    async ({ id, ...text }) => {
      await updateVersionScreenshot(id, text);
      return "Capture enregistrée.";
    },
  );
}

export async function removeVersionScreenshotAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(deleteSchema, formData, async ({ id }) => {
    await removeVersionScreenshot(id);
    return "Image retirée de la galerie.";
  });
}

export async function moveVersionScreenshotAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(moveSchema, formData, async ({ id, direction }) => {
    await moveVersionScreenshot(id, direction);
    return "Ordre mis à jour.";
  });
}

export async function setSiteMediaAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    siteMediaSchema,
    formData,
    async ({ slot, mediaId }) => {
      await setSiteMedia(slot, mediaId);
      if (slot === "cv")
        return mediaId ? "CV enregistré." : "CV retiré du site.";
      if (slot === "profilePhoto")
        return mediaId
          ? "Photo de profil enregistrée."
          : "Photo retirée : les initiales sont affichées.";
      return mediaId
        ? "Image de partage enregistrée."
        : "Image de partage retirée.";
    },
  );
}
