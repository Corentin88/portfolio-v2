"use server";

import { runAdminAction } from "@/features/auth/admin-action";
import {
  timelineEntrySchema,
  timelineEntryUpdateSchema,
} from "@/features/timeline/schemas";
import {
  createTimelineEntry,
  deleteTimelineEntry,
  moveTimelineEntry,
  updateTimelineEntry,
} from "@/features/timeline/service";
import type { ActionState } from "@/lib/action-result";
import { deleteSchema, moveSchema } from "@/lib/validation";

export async function createTimelineEntryAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(timelineEntrySchema, formData, async (data) => {
    await createTimelineEntry(data);
    return "Étape ajoutée en fin de timeline.";
  });
}

export async function updateTimelineEntryAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(
    timelineEntryUpdateSchema,
    formData,
    async ({ id, ...data }) => {
      await updateTimelineEntry(id, data);
      return "Étape enregistrée.";
    },
  );
}

export async function deleteTimelineEntryAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(deleteSchema, formData, async ({ id }) => {
    await deleteTimelineEntry(id);
    return "Étape supprimée.";
  });
}

export async function moveTimelineEntryAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(moveSchema, formData, async ({ id, direction }) => {
    await moveTimelineEntry(id, direction);
    return "Ordre mis à jour.";
  });
}
