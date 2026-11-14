import { db } from "@/lib/db";
import { DomainError, isNotFoundError } from "@/lib/errors";
import type {
  ContactSettingsInput,
  HomeContentInput,
  SeoSettingsInput,
} from "@/features/site-settings/schemas";

type SiteSettingsPatch =
  HomeContentInput | ContactSettingsInput | SeoSettingsInput;

/**
 * Met à jour une partie des réglages (ligne unique id = 1). Chaque formulaire
 * n'envoie que ses propres champs : les autres réglages restent intacts.
 */
export async function updateSiteSettings(
  patch: SiteSettingsPatch,
): Promise<void> {
  try {
    await db.siteSettings.update({ where: { id: 1 }, data: patch });
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new DomainError(
        "Les réglages du site n'existent pas encore : lancez le seed initial.",
      );
    }
    throw error;
  }
}
