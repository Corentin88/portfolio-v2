import type { ContactMessageInput } from "@/features/contact/schemas";

// Couleurs du thème du portfolio, en dur : les clients de messagerie ignorent
// les variables CSS et les feuilles de style externes.
const COLORS = {
  royal: "#0d4cc0",
  navyDeep: "#071533",
  amber: "#ffb224",
  amberInk: "#0b1830",
  skySoft: "#cfe0ff",
  text: "#1b2540",
  muted: "#4d5f8f",
  border: "#dfe6f3",
  surface: "#f2f5fb",
} as const;

const FONT = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Consolas,'Liberation Mono',monospace";

/** Échappement HTML de toute donnée saisie par le visiteur. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type ContactEmail = { subject: string; html: string; text: string };

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

function row(label: string, valueHtml: string): string {
  return `<tr>
<td style="padding:6px 0;width:90px;vertical-align:top;font-family:${MONO};font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${COLORS.muted};">${label}</td>
<td style="padding:6px 0;font-family:${FONT};font-size:15px;color:${COLORS.text};">${valueHtml}</td>
</tr>`;
}

/** Notification envoyée au propriétaire du portfolio (HTML + texte brut). */
export function buildContactEmail(
  input: ContactMessageInput,
  receivedAt: Date,
): ContactEmail {
  const topic = input.subject || "Nouveau message";
  const subject = `[Portfolio] ${topic} — ${input.name}`.slice(0, 200);
  const date = formatDate(receivedAt);

  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const mailto = `mailto:${encodeURIComponent(input.email)}`;
  const message = escapeHtml(input.message).replaceAll("\n", "<br>");

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.surface};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.surface};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;">
<tr><td style="background:${COLORS.royal};padding:28px 32px;">
<div style="font-family:${MONO};font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${COLORS.amber};">// contact</div>
<div style="margin-top:8px;font-family:${FONT};font-size:24px;font-weight:700;color:#ffffff;">Nouveau message du portfolio</div>
<div style="margin-top:12px;width:56px;height:4px;border-radius:4px;background:${COLORS.amber};"></div>
</td></tr>
<tr><td style="padding:28px 32px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row("De", name)}
${row("E-mail", `<a href="${mailto}" style="color:${COLORS.royal};text-decoration:none;">${email}</a>`)}
${row("Sujet", escapeHtml(topic))}
${row("Reçu", escapeHtml(date))}
</table>
</td></tr>
<tr><td style="padding:16px 32px 8px;">
<div style="border-left:4px solid ${COLORS.amber};background:${COLORS.surface};border-radius:8px;padding:18px 20px;font-family:${FONT};font-size:15px;line-height:1.6;color:${COLORS.text};word-wrap:break-word;">${message}</div>
</td></tr>
<tr><td style="padding:20px 32px 32px;">
<a href="${mailto}" style="display:inline-block;background:${COLORS.amber};color:${COLORS.amberInk};font-family:${FONT};font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:999px;">Répondre à ${name}</a>
</td></tr>
<tr><td style="background:${COLORS.navyDeep};padding:16px 32px;font-family:${MONO};font-size:12px;line-height:1.5;color:${COLORS.skySoft};">
Envoyé depuis le formulaire de contact du portfolio. Répondre à cet e-mail écrit directement au visiteur.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    "Nouveau message du portfolio",
    "",
    `De : ${input.name}`,
    `E-mail : ${input.email}`,
    `Sujet : ${topic}`,
    `Reçu : ${date}`,
    "",
    "Message :",
    input.message,
    "",
    "—",
    "Répondre à cet e-mail écrit directement au visiteur.",
  ].join("\n");

  return { subject, html, text };
}
