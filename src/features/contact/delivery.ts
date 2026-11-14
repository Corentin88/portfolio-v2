import path from "node:path";
import { getContactMailConfig, getStateDir } from "@/lib/env";
import {
  createFileRateLimiter,
  type FileRateLimiter,
} from "@/lib/file-rate-limit";
import { createResendMailer } from "@/lib/mailer";
import type { MailSettings } from "@/features/contact/service";
import { getPublicSiteSettings } from "@/features/site-settings/queries";

const MINUTE = 60 * 1000;

/** Envoi Resend vers l'adresse de contact réglée dans l'administration. */
export async function loadMailSettings(): Promise<MailSettings> {
  const config = getContactMailConfig();
  const settings = await getPublicSiteSettings();
  return {
    mailer: config ? createResendMailer({ apiKey: config.apiKey }) : null,
    from: config?.from ?? null,
    recipient: settings?.contactEmail ?? null,
  };
}

let limiter: FileRateLimiter | undefined;

// Créé à la première soumission : le dossier d'état et le secret ne sont lus
// qu'à l'exécution, jamais au build.
export function getContactRateLimiter(): FileRateLimiter {
  limiter ??= createFileRateLimiter({
    filePath: path.join(getStateDir(), "contact-rate-limit.json"),
    secret: process.env.AUTH_SECRET ?? "",
    rules: [
      { scope: "client", limit: 3, windowMs: 10 * MINUTE },
      { scope: "client", limit: 10, windowMs: 24 * 60 * MINUTE },
      // Plafond global : borne le volume d'e-mails même en cas d'attaque distribuée.
      { scope: "global", limit: 30, windowMs: 60 * MINUTE },
    ],
  });
  return limiter;
}
