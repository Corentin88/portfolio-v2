export type MailMessage = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
};

/** Abstraction minimale de l'envoi : remplacée par un faux en test. */
export type Mailer = {
  send: (message: MailMessage) => Promise<void>;
};

/**
 * Échec de l'envoi chez le fournisseur. Ne porte que le statut HTTP et le type
 * d'erreur annoncé : jamais la clé d'API, l'en-tête ni le contenu du message.
 */
export class MailDeliveryError extends Error {
  override name = "MailDeliveryError";

  constructor(
    readonly status: number | null,
    readonly providerError: string | null = null,
  ) {
    super(
      `Envoi refusé par le fournisseur (${status ?? "réseau"}${
        providerError ? `, ${providerError}` : ""
      }).`,
    );
  }
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

type ResendMailerOptions = {
  apiKey: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
};

async function providerErrorName(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "name" in body) {
      const name = String(body.name);
      // Identifiant court attendu (ex. validation_error) : rien d'autre n'est conservé.
      return /^[a-z_]{1,50}$/.test(name) ? name : null;
    }
  } catch {
    // Corps absent ou non JSON.
  }
  return null;
}

/**
 * Client Resend par l'API HTTP (https://resend.com/docs/api-reference/emails/send-email).
 * Un simple appel fetch évite une dépendance supplémentaire.
 */
export function createResendMailer({
  apiKey,
  fetch = globalThis.fetch,
  timeoutMs = 10_000,
}: ResendMailerOptions): Mailer {
  return {
    async send(message) {
      let response: Response;
      try {
        response = await fetch(RESEND_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: message.from,
            to: [message.to],
            reply_to: message.replyTo,
            subject: message.subject,
            html: message.html,
            text: message.text,
          }),
          signal: AbortSignal.timeout(timeoutMs),
          cache: "no-store",
        });
      } catch {
        // Erreur réseau ou délai dépassé : l'erreur d'origine peut citer la requête.
        throw new MailDeliveryError(null);
      }
      if (!response.ok) {
        throw new MailDeliveryError(
          response.status,
          await providerErrorName(response),
        );
      }
    },
  };
}
