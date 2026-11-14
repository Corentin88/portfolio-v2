/** Erreur métier dont le message est destiné à l'utilisateur (règle de gestion non respectée). */
export class DomainError extends Error {
  override name = "DomainError";
}

function prismaCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
}

/** Violation d'une contrainte d'unicité (nom ou slug déjà utilisé). */
export function isUniqueConstraintError(error: unknown): boolean {
  return prismaCode(error) === "P2002";
}

/** Suppression refusée par une clé étrangère en Restrict (élément encore utilisé). */
export function isForeignKeyError(error: unknown): boolean {
  return prismaCode(error) === "P2003";
}

/** Enregistrement absent (modifié ou supprimé entre-temps). */
export function isNotFoundError(error: unknown): boolean {
  return prismaCode(error) === "P2025";
}

/** Traduit les erreurs Prisma attendues d'une écriture en messages pour l'utilisateur. */
export async function withDomainErrors<T>(
  operation: Promise<T>,
  messages: { notFound: string; duplicate?: string; inUse?: string },
): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    if (isNotFoundError(error)) throw new DomainError(messages.notFound);
    if (messages.duplicate && isUniqueConstraintError(error)) {
      throw new DomainError(messages.duplicate);
    }
    if (messages.inUse && isForeignKeyError(error)) {
      throw new DomainError(messages.inUse);
    }
    throw error;
  }
}
