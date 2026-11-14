import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "dotenv";

export const E2E_PORT = 3100;
export const BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_STORAGE = path.resolve("storage/e2e");

/** Compte fictif, créé uniquement dans la base E2E. */
export const ADMIN = {
  email: "admin@e2e.test",
  password: "Mot-de-passe-E2E-fictif-2026",
  name: "Admin E2E",
};

/**
 * URL de la base E2E : E2E_DATABASE_URL si fournie, sinon DATABASE_URL du .env
 * avec le nom de base suffixé `_e2e` (même compte, droits accordés à part).
 * Garde-fou : jamais une base qui ne se termine pas par `_e2e` — les tests la vident.
 */
export function e2eDatabaseUrl(): string {
  let value = process.env.E2E_DATABASE_URL;
  if (!value) {
    const envFile = path.resolve(".env");
    const base = existsSync(envFile)
      ? parse(readFileSync(envFile)).DATABASE_URL
      : process.env.DATABASE_URL;
    if (!base)
      throw new Error("DATABASE_URL introuvable pour dériver la base E2E.");
    const url = new URL(base);
    const name = decodeURIComponent(url.pathname.slice(1));
    url.pathname = `/${name.endsWith("_e2e") ? name : `${name}_e2e`}`;
    value = url.href;
  }
  assertE2eDatabase(value);
  return value;
}

export function assertE2eDatabase(url: string): void {
  const name = decodeURIComponent(new URL(url).pathname.slice(1));
  if (!name.endsWith("_e2e")) {
    throw new Error(
      `Base E2E refusée : « ${name} » ne se termine pas par _e2e.`,
    );
  }
}

/**
 * Environnement du serveur testé. Les valeurs vides écrasent celles du .env
 * (Next ne remplace jamais une variable déjà définie) : aucun envoi Resend possible.
 */
export function e2eServerEnv(): Record<string, string> {
  return {
    DATABASE_URL: e2eDatabaseUrl(),
    MEDIA_ROOT: path.join(E2E_STORAGE, "media"),
    STATE_DIR: path.join(E2E_STORAGE, "state"),
    SITE_URL: BASE_URL,
    AUTH_URL: BASE_URL,
    AUTH_TRUST_HOST: "true",
    RESEND_API_KEY: "",
    CONTACT_FROM: "",
  };
}
