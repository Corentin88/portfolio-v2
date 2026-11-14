import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limit";
import { hashPassword, verifyPassword } from "@/features/auth/password";
import type { LoginInput } from "@/features/auth/schemas";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// Par origine : 5 échecs en 15 min bloquent l'origine sans même vérifier le mot de passe.
const failuresByClient = createRateLimiter({
  limit: 5,
  windowMs: FIFTEEN_MINUTES,
});
// Par compte : délai croissant plutôt que verrouillage, pour qu'une attaque
// distribuée ne puisse pas bloquer le propriétaire hors de son administration.
const failuresByAccount = createRateLimiter({
  limit: Number.POSITIVE_INFINITY,
  windowMs: FIFTEEN_MINUTES,
});

export type AuthenticatedAdmin = {
  id: string;
  email: string;
  name: string;
  sessionVersion: number;
};

export type AuthenticationResult =
  | { ok: true; admin: AuthenticatedAdmin }
  | { ok: false; reason: "invalid_credentials" | "rate_limited" };

export function accountFailureDelayMs(failures: number): number {
  return failures > 5 ? Math.min(1000 * 2 ** (failures - 6), 15_000) : 0;
}

// Empreinte factice : un e-mail inconnu coûte le même calcul Argon2 qu'un mot
// de passe erroné, ce qui empêche de deviner l'existence du compte au temps de réponse.
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomUUID());
  return dummyHash;
}

export async function authenticateAdmin(
  input: LoginInput,
  clientKey: string,
): Promise<AuthenticationResult> {
  if (failuresByClient.isBlocked(clientKey)) {
    return { ok: false, reason: "rate_limited" };
  }

  const admin = await db.adminUser.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      displayName: true,
      passwordHash: true,
      sessionVersion: true,
    },
  });

  const passwordMatches = await verifyPassword(
    admin?.passwordHash ?? (await getDummyHash()),
    input.password,
  );

  if (!admin || !passwordMatches) {
    failuresByClient.recordFailure(clientKey);
    failuresByAccount.recordFailure(input.email);
    const delay = accountFailureDelayMs(
      failuresByAccount.failures(input.email),
    );
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    return { ok: false, reason: "invalid_credentials" };
  }

  failuresByClient.reset(clientKey);
  failuresByAccount.reset(input.email);
  await db.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    ok: true,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.displayName,
      sessionVersion: admin.sessionVersion,
    },
  };
}
