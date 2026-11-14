import path from "node:path";

const DATABASE_PROTOCOLS = new Set(["mysql:", "mariadb:"]);

/**
 * URL de la base applicative. Lue à la demande (et non au chargement du module)
 * pour que le build n'exige pas de base de données.
 */
export function getDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error("Variable d'environnement manquante : DATABASE_URL.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL n'est pas une URL valide.");
  }

  if (!DATABASE_PROTOCOLS.has(url.protocol)) {
    throw new Error("DATABASE_URL doit utiliser le protocole mysql://.");
  }

  // L'application ne doit jamais écrire dans la base shadow, que Prisma vide à chaque migration.
  if (url.pathname.endsWith("_shadow")) {
    throw new Error("DATABASE_URL ne doit pas désigner une base shadow.");
  }

  return value;
}

/**
 * Racine du stockage des médias, hors base : `./storage/media` en local, volume
 * Docker monté (ex. `/data/media`) en production. Toujours résolue en chemin absolu.
 */
export function getMediaRoot(): string {
  const configured = process.env.MEDIA_ROOT?.trim() || "storage/media";
  // Chemin connu seulement à l'exécution : exclu de l'analyse de Turbopack, qui
  // embarquerait sinon tout le projet dans la sortie du build.
  return path.resolve(/* turbopackIgnore: true */ configured);
}

/**
 * Dossier des états persistants hors base (compteurs anti-abus) : `./storage/state`
 * en local, volume Docker en production. Toujours résolu en chemin absolu.
 */
export function getStateDir(): string {
  const configured = process.env.STATE_DIR?.trim() || "storage/state";
  return path.resolve(/* turbopackIgnore: true */ configured);
}

export type ContactMailConfig = { apiKey: string; from: string };

/**
 * Configuration de l'envoi du formulaire de contact, ou null si incomplète (le
 * formulaire signale alors une indisponibilité). La clé ne quitte jamais le serveur.
 */
export function getContactMailConfig(): ContactMailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.CONTACT_FROM?.trim();
  return apiKey && from ? { apiKey, from } : null;
}

const DEFAULT_CONTACT_RETENTION_DAYS = 365;

/**
 * Durée de conservation des messages de contact, en jours (CONTACT_RETENTION_DAYS,
 * 365 par défaut, entre 1 et 3650). Au-delà, les messages sont supprimés.
 */
export function getContactRetentionDays(): number {
  const value = Number(process.env.CONTACT_RETENTION_DAYS?.trim());
  return Number.isInteger(value) && value >= 1 && value <= 3650
    ? value
    : DEFAULT_CONTACT_RETENTION_DAYS;
}

/**
 * Adresse publique du site (ex. https://exemple.fr), facultative. Sert de base aux
 * URL absolues (image de partage) ; à défaut, l'hôte de la requête est utilisé.
 */
export function getSiteUrl(): URL | null {
  const value = process.env.SITE_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}
