import { db } from "@/lib/db";

/** Expiration après inactivité : Auth.js prolonge le jeton à chaque requête. */
export const SESSION_IDLE_MAX_AGE_SECONDS = 8 * 60 * 60;

/** Durée de vie maximale depuis la connexion, quelle que soit l'activité. */
export const SESSION_ABSOLUTE_LIFETIME_MS = 12 * 60 * 60 * 1000;

export type AdminTokenClaims = {
  adminId: string;
  sessionVersion: number;
  loginAt: number;
};

export function readAdminClaims(
  token: Record<string, unknown>,
): AdminTokenClaims | null {
  const { adminId, sessionVersion, loginAt } = token;
  if (
    typeof adminId !== "string" ||
    typeof sessionVersion !== "number" ||
    typeof loginAt !== "number"
  ) {
    return null;
  }
  return { adminId, sessionVersion, loginAt };
}

/**
 * Vérifie à chaque lecture de session que le compte existe encore et que sa
 * version n'a pas été incrémentée : c'est ce qui rend la révocation immédiate
 * malgré des sessions JWT sans état côté serveur.
 */
export async function isAdminSessionValid(
  claims: AdminTokenClaims,
  now: number = Date.now(),
): Promise<boolean> {
  if (now - claims.loginAt > SESSION_ABSOLUTE_LIFETIME_MS) return false;

  const admin = await db.adminUser.findUnique({
    where: { id: claims.adminId },
    select: { sessionVersion: true },
  });
  return admin?.sessionVersion === claims.sessionVersion;
}

type SignInUser = { id?: string; sessionVersion?: unknown };

/**
 * Logique du callback jwt d'Auth.js. À la connexion, fige l'identité, la version
 * de session et l'heure de connexion ; ensuite, revalide le jeton à chaque lecture.
 * Renvoyer null invalide la session et fait supprimer le cookie par Auth.js.
 */
export async function refreshAdminToken<T extends Record<string, unknown>>(
  token: T,
  signInUser?: SignInUser,
  now: number = Date.now(),
): Promise<T | null> {
  if (signInUser) {
    const { id, sessionVersion } = signInUser;
    if (!id || typeof sessionVersion !== "number") return null;
    return { ...token, adminId: id, sessionVersion, loginAt: now };
  }

  const claims = readAdminClaims(token);
  return claims && (await isAdminSessionValid(claims, now)) ? token : null;
}

/** Invalide toutes les sessions ouvertes du compte, y compris la session courante. */
export async function revokeAdminSessions(adminId: string): Promise<void> {
  await db.adminUser.update({
    where: { id: adminId },
    data: { sessionVersion: { increment: 1 } },
  });
}
