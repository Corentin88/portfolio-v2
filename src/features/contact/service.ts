import { z } from "zod";
import { db } from "@/lib/db";
import type { ActionResult } from "@/lib/action-result";
import { DomainError, isUniqueConstraintError } from "@/lib/errors";
import { MailDeliveryError, type Mailer } from "@/lib/mailer";
import { buildContactEmail } from "@/features/contact/email-template";
import { statusUpdate } from "@/features/contact/message-status";
import {
  HONEYPOT_FIELD,
  STARTED_AT_FIELD,
  SUBMISSION_ID_FIELD,
  contactMessageSchema,
  submissionIdSchema,
  type MessageStatus,
} from "@/features/contact/schemas";

/** Délai minimal entre l'affichage du formulaire et l'envoi (saisie humaine). */
export const MIN_FILL_TIME_MS = 3000;

const DAY_MS = 24 * 60 * 60 * 1000;

export const CONTACT_MESSAGES = {
  sent: "Merci, votre message a bien été reçu. Je vous réponds au plus vite.",
  invalid: "Veuillez corriger les champs indiqués.",
  tooFast:
    "Votre message est parti un peu vite. Vérifiez-le puis cliquez à nouveau sur « Envoyer ».",
  expired:
    "Le formulaire a expiré. Rechargez la page puis renvoyez votre message.",
  rateLimited:
    "Trop de messages envoyés depuis votre connexion. Réessayez un peu plus tard.",
  failed:
    "Votre message n'a pas pu être enregistré. Réessayez dans quelques minutes.",
} as const;

/** Envoi de la notification ; chaque valeur est null si non configurée. */
export type MailSettings = {
  mailer: Mailer | null;
  from: string | null;
  /** Adresse du propriétaire (réglages du site), null tant qu'elle est provisoire. */
  recipient: string | null;
};

export type ContactDependencies = MailSettings & {
  consumeRateLimit: (clientKey: string) => Promise<boolean>;
  retentionDays: number;
  now?: () => number;
};

type StoredMessage = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  createdAt: Date;
};

/** Champs réaffichés après une erreur (jamais les champs anti-robot). */
function keptValues(values: Record<string, string>): Record<string, string> {
  return {
    name: values.name ?? "",
    email: values.email ?? "",
    subject: values.subject ?? "",
    message: values.message ?? "",
  };
}

function failure(
  values: Record<string, string>,
  error: string,
  fieldErrors?: Record<string, string>,
): ActionResult {
  return { ok: false, error, fieldErrors, values: keptValues(values) };
}

/**
 * Notifie le propriétaire par e-mail et date l'envoi réussi. Un échec est
 * journalisé (statut seulement, jamais le contenu) : le message reste en base,
 * signalé dans l'administration, où l'envoi peut être relancé.
 */
export async function notifyOwner(
  message: StoredMessage,
  mail: MailSettings,
): Promise<boolean> {
  if (!mail.mailer || !mail.from || !mail.recipient) {
    console.warn(
      "[contact] notification non configurée (clé, expéditeur ou destinataire)",
    );
    return false;
  }

  const email = buildContactEmail(
    {
      name: message.name,
      email: message.email,
      subject: message.subject ?? "",
      message: message.message,
    },
    message.createdAt,
  );
  try {
    await mail.mailer.send({
      from: mail.from,
      to: mail.recipient,
      replyTo: message.email,
      ...email,
    });
  } catch (error) {
    const detail =
      error instanceof MailDeliveryError ? error.message : "erreur inattendue";
    console.error(`[contact] échec de notification : ${detail}`);
    return false;
  }

  try {
    await db.contactMessage.update({
      where: { id: message.id },
      data: { notifiedAt: new Date() },
    });
  } catch {
    // L'e-mail est parti : seul le suivi manque, le visiteur n'a pas à le subir.
    console.warn("[contact] notification envoyée mais non datée");
  }
  return true;
}

/** Suppression définitive des messages plus anciens que la durée de conservation. */
export async function purgeExpiredMessages(
  retentionDays: number,
  now = Date.now(),
): Promise<number> {
  const { count } = await db.contactMessage.deleteMany({
    where: { createdAt: { lt: new Date(now - retentionDays * DAY_MS) } },
  });
  return count;
}

function looksAutomated(values: Record<string, string>): boolean {
  return (values[HONEYPOT_FIELD] ?? "").trim() !== "";
}

function sentTooFast(values: Record<string, string>, now: number): boolean {
  const startedAt = Number(values[STARTED_AT_FIELD]);
  return (
    !Number.isFinite(startedAt) ||
    startedAt <= 0 ||
    now - startedAt < MIN_FILL_TIME_MS
  );
}

/**
 * Traite une soumission du formulaire public :
 * honeypot → délai minimal → validation → idempotence → limitation → enregistrement
 * → notification. Le message enregistré fait foi : le succès affiché est réel même
 * si l'e-mail échoue (signalé et relançable dans l'administration).
 */
export async function submitContactMessage(
  values: Record<string, string>,
  clientKey: string,
  deps: ContactDependencies,
): Promise<ActionResult> {
  const now = deps.now?.() ?? Date.now();

  // Robot avéré (champ invisible rempli) : faux succès, rien n'est enregistré.
  if (looksAutomated(values)) {
    return { ok: true, message: CONTACT_MESSAGES.sent };
  }
  // Soumission trop rapide : rien n'est enregistré, mais le visiteur est prévenu
  // et garde sa saisie, pour qu'aucun message humain ne soit perdu en silence.
  if (sentTooFast(values, now)) {
    return failure(values, CONTACT_MESSAGES.tooFast);
  }

  const parsed = contactMessageSchema.safeParse(values);
  if (!parsed.success) {
    const fields = z.flattenError(parsed.error).fieldErrors;
    const fieldErrors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(fields)) {
      if (messages?.[0]) fieldErrors[field] = messages[0];
    }
    return failure(values, CONTACT_MESSAGES.invalid, fieldErrors);
  }

  const submissionId = submissionIdSchema.safeParse(
    values[SUBMISSION_ID_FIELD],
  );
  if (!submissionId.success) {
    return failure(values, CONTACT_MESSAGES.expired);
  }

  // Base ou stockage des compteurs indisponible : le visiteur garde sa saisie et
  // peut réessayer, au lieu de tomber sur la page d'erreur générique.
  try {
    // Nouvelle tentative ou double soumission : le message est déjà enregistré,
    // on confirme sans doublon ni second e-mail (relance possible dans l'admin).
    const existing = await db.contactMessage.findUnique({
      where: { submissionId: submissionId.data },
      select: { id: true },
    });
    if (existing) return { ok: true, message: CONTACT_MESSAGES.sent };

    // Limitation indisponible → refus (fail closed) : le plafond global borne le
    // volume d'e-mails, il ne doit pas sauter avec un disque plein.
    if (!(await deps.consumeRateLimit(clientKey))) {
      console.warn("[contact] limite d'envoi atteinte");
      return failure(values, CONTACT_MESSAGES.rateLimited);
    }
  } catch {
    console.error("[contact] vérification préalable impossible (base ou état)");
    return failure(values, CONTACT_MESSAGES.failed);
  }

  let stored: StoredMessage;
  try {
    stored = await db.contactMessage.create({
      data: {
        submissionId: submissionId.data,
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject || null,
        message: parsed.data.message,
        createdAt: new Date(now),
      },
      select: {
        id: true,
        name: true,
        email: true,
        subject: true,
        message: true,
        createdAt: true,
      },
    });
  } catch (error) {
    // Requête concurrente avec la même clé : l'autre l'a enregistré et notifie.
    if (isUniqueConstraintError(error)) {
      return { ok: true, message: CONTACT_MESSAGES.sent };
    }
    console.error("[contact] échec d'enregistrement du message");
    return failure(values, CONTACT_MESSAGES.failed);
  }

  await notifyOwner(stored, deps);

  try {
    await purgeExpiredMessages(deps.retentionDays, now);
  } catch {
    console.warn("[contact] purge des messages expirés impossible");
  }

  return { ok: true, message: CONTACT_MESSAGES.sent };
}

// ─────────────────────────────── Administration ───────────────────────────────

const NOT_FOUND = "Message introuvable (déjà supprimé ?).";

async function findMessageDates(id: string) {
  const message = await db.contactMessage.findUnique({
    where: { id },
    select: { readAt: true, handledAt: true },
  });
  if (!message) throw new DomainError(NOT_FOUND);
  return message;
}

export async function setMessageStatus(
  id: string,
  status: MessageStatus,
  now = new Date(),
): Promise<void> {
  const current = await findMessageDates(id);
  await db.contactMessage.update({
    where: { id },
    data: statusUpdate(status, current, now),
  });
}

/** Marque comme lu à l'ouverture ; sans effet si déjà lu ou absent. */
export async function markMessageAsRead(id: string, now = new Date()) {
  await db.contactMessage.updateMany({
    where: { id, readAt: null },
    data: { readAt: now },
  });
}

/** Suppression définitive (données personnelles). */
export async function deleteMessage(id: string): Promise<void> {
  const { count } = await db.contactMessage.deleteMany({ where: { id } });
  if (count === 0) throw new DomainError(NOT_FOUND);
}

/** Relance manuelle d'une notification restée en échec. */
export async function resendNotification(
  id: string,
  mail: MailSettings,
): Promise<void> {
  const message = await db.contactMessage.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      subject: true,
      message: true,
      createdAt: true,
      notifiedAt: true,
    },
  });
  if (!message) throw new DomainError(NOT_FOUND);
  if (message.notifiedAt) {
    throw new DomainError("La notification de ce message est déjà partie.");
  }
  if (!(await notifyOwner(message, mail))) {
    throw new DomainError(
      "L'e-mail n'a pas pu être envoyé. Vérifiez la configuration Resend puis réessayez.",
    );
  }
}
