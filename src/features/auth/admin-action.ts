import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/auth/require-admin";
import type { ActionResult } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import { invalidatePublicContent } from "@/lib/public-cache";
import { formDataToObject } from "@/lib/validation";

/**
 * Enchaînement commun des mutations de l'administration :
 * autorisation → validation Zod → règle métier → invalidation du cache public.
 * La fonction métier renvoie le message de confirmation ; une DomainError devient
 * un message d'erreur lisible, toute autre erreur remonte (journalisée par Next).
 */
export async function runAdminAction<Schema extends z.ZodType>(
  schema: Schema,
  formData: FormData,
  run: (data: z.output<Schema>) => Promise<string>,
  // false pour les données privées (messages) : rien à invalider côté public.
  { invalidatePublic = true }: { invalidatePublic?: boolean } = {},
): Promise<ActionResult> {
  await requireAdmin();

  const values = formDataToObject(formData);
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return {
      ok: false,
      error: "Vérifiez les champs signalés.",
      fieldErrors,
      values,
    };
  }

  try {
    const message = await run(parsed.data);
    if (invalidatePublic) invalidatePublicContent();
    // Réaffiche la page d'administration courante avec les valeurs enregistrées.
    refresh();
    return { ok: true, message };
  } catch (error) {
    if (error instanceof DomainError) {
      return { ok: false, error: error.message, values };
    }
    throw error;
  }
}
