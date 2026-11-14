"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import type { ActionResult, ActionState } from "@/lib/action-result";
import { clientKeyFromHeaders } from "@/lib/client-key";
import { getContactRetentionDays } from "@/lib/env";
import { deleteSchema, formDataToObject, idSchema } from "@/lib/validation";
import { runAdminAction } from "@/features/auth/admin-action";
import { requireAdmin } from "@/features/auth/require-admin";
import {
  getContactRateLimiter,
  loadMailSettings,
} from "@/features/contact/delivery";
import { setMessageStatusSchema } from "@/features/contact/schemas";
import {
  deleteMessage,
  markMessageAsRead,
  resendNotification,
  type MailSettings,
  setMessageStatus,
  submitContactMessage,
} from "@/features/contact/service";

const PRIVATE = { invalidatePublic: false };

/** Formulaire public : seule action accessible sans session. */
export async function sendContactMessage(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  const [requestHeaders, mail] = await Promise.all([
    headers(),
    // Réglages illisibles (base indisponible) : le message peut encore être
    // enregistré par la suite ; sa notification sera relançable dans l'admin.
    loadMailSettings().catch((): MailSettings => ({
      mailer: null,
      from: null,
      recipient: null,
    })),
  ]);
  return submitContactMessage(
    formDataToObject(formData),
    clientKeyFromHeaders(requestHeaders),
    {
      ...mail,
      consumeRateLimit: (key) => getContactRateLimiter().consume(key),
      retentionDays: getContactRetentionDays(),
    },
  );
}

const STATUS_CONFIRMATIONS = {
  unread: "Message marqué comme non lu.",
  read: "Message marqué comme lu.",
  handled: "Message marqué comme traité.",
} as const;

export async function setMessageStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  return runAdminAction(
    setMessageStatusSchema,
    formData,
    async ({ id, status }) => {
      await setMessageStatus(id, status);
      return STATUS_CONFIRMATIONS[status];
    },
    PRIVATE,
  );
}

export async function resendNotificationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  return runAdminAction(
    deleteSchema,
    formData,
    async ({ id }) => {
      await resendNotification(id, await loadMailSettings());
      return "Notification envoyée.";
    },
    PRIVATE,
  );
}

export async function deleteMessageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionResult> {
  const result = await runAdminAction(
    deleteSchema,
    formData,
    async ({ id }) => {
      await deleteMessage(id);
      return "Message supprimé.";
    },
    PRIVATE,
  );
  // Le message n'existe plus : retour à la liste.
  if (result.ok) redirect("/admin/messages");
  return result;
}

/** Appelée à l'ouverture d'un message (effet client, jamais au préchargement). */
export async function markMessageAsReadAction(id: string): Promise<void> {
  await requireAdmin();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return;
  await markMessageAsRead(parsed.data);
  refresh();
}
