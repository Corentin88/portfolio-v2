"use server";

import { runAdminAction } from "@/features/auth/admin-action";
import {
  contactSettingsSchema,
  homeContentSchema,
  seoSettingsSchema,
} from "@/features/site-settings/schemas";
import { updateSiteSettings } from "@/features/site-settings/service";
import type { ActionState } from "@/lib/action-result";

export async function updateHomeContentAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(homeContentSchema, formData, async (data) => {
    await updateSiteSettings(data);
    return "Accueil et présentation enregistrés.";
  });
}

export async function updateContactSettingsAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(contactSettingsSchema, formData, async (data) => {
    await updateSiteSettings(data);
    return "Coordonnées enregistrées.";
  });
}

export async function updateSeoSettingsAction(
  _previous: ActionState,
  formData: FormData,
) {
  return runAdminAction(seoSettingsSchema, formData, async (data) => {
    await updateSiteSettings(data);
    return "Paramètres SEO enregistrés.";
  });
}
