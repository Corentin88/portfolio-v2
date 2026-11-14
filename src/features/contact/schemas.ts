import { z } from "zod";

// Caractères de contrôle (dont CR/LF) : retirés des champs d'une ligne, qui
// finissent dans l'objet de l'e-mail, pour écarter toute injection d'en-tête.
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;
// Dans le message, seuls les retours à la ligne et tabulations sont conservés.
const CONTROL_CHARS_EXCEPT_LAYOUT =
  /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;

function singleLine(value: string): string {
  return value.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
}

export const CONTACT_LIMITS = {
  name: 100,
  email: 254,
  subject: 150,
  messageMin: 10,
  messageMax: 5000,
} as const;

export const contactMessageSchema = z.object({
  name: z
    .string()
    .transform(singleLine)
    .pipe(
      z
        .string()
        .min(2, { error: "Indiquez votre nom." })
        .max(CONTACT_LIMITS.name, {
          error: `${CONTACT_LIMITS.name} caractères maximum.`,
        }),
    ),
  email: z
    .string()
    .trim()
    .pipe(
      z
        .email({ error: "Adresse e-mail invalide." })
        .max(CONTACT_LIMITS.email, { error: "Adresse e-mail trop longue." }),
    ),
  subject: z
    .string()
    .optional()
    .transform((value) => singleLine(value ?? ""))
    .pipe(
      z.string().max(CONTACT_LIMITS.subject, {
        error: `${CONTACT_LIMITS.subject} caractères maximum.`,
      }),
    ),
  message: z
    .string()
    .transform((value) =>
      value
        .replace(/\r\n?/g, "\n")
        .replace(CONTROL_CHARS_EXCEPT_LAYOUT, "")
        .trim(),
    )
    .pipe(
      z
        .string()
        .min(CONTACT_LIMITS.messageMin, {
          error: `Votre message est un peu court (${CONTACT_LIMITS.messageMin} caractères minimum).`,
        })
        .max(CONTACT_LIMITS.messageMax, {
          error: `${CONTACT_LIMITS.messageMax} caractères maximum.`,
        }),
    ),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

/** Champs anti-robot, contrôlés avant toute validation. */
export const HONEYPOT_FIELD = "website";
export const STARTED_AT_FIELD = "startedAt";

/** Clé d'idempotence tirée à l'affichage du formulaire (une par message). */
export const SUBMISSION_ID_FIELD = "submissionId";
export const submissionIdSchema = z.uuid();

// ─────────────────────────────── Administration ───────────────────────────────

export const MESSAGE_STATUSES = ["unread", "read", "handled"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const MESSAGES_PAGE_SIZE = 20;

/**
 * Paramètres d'URL de la liste. Une valeur invalide retombe sur la valeur par
 * défaut : une URL bricolée affiche la liste au lieu d'une erreur.
 */
export const messageListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  q: z.string().transform(singleLine).pipe(z.string().max(100)).catch(""),
  status: z.enum(["all", ...MESSAGE_STATUSES]).catch("all"),
});

export type MessageListParams = z.output<typeof messageListParamsSchema>;

/** searchParams de Next (valeurs simples ou répétées) → paramètres validés. */
export function parseMessageListParams(
  raw: Record<string, string | string[] | undefined>,
): MessageListParams {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  return messageListParamsSchema.parse({
    page: first(raw.page),
    q: first(raw.q) ?? "",
    status: first(raw.status),
  });
}

export const setMessageStatusSchema = z.object({
  id: z.string().trim().min(1).max(30),
  status: z.enum(MESSAGE_STATUSES),
});
