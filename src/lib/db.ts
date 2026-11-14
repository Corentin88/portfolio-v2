import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseUrl } from "@/lib/env";

function createPrismaClient(): PrismaClient {
  // L'adaptateur accepte une URL mysql:// et la convertit pour le pilote mariadb.
  const adapter = new PrismaMariaDb(getDatabaseUrl());
  return new PrismaClient({ adapter });
}

// En développement, le rechargement à chaud réévalue les modules : on réutilise
// le client existant pour ne pas multiplier les pools de connexions.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

/** Sonde de santé : true si la base répond à une requête triviale. */
export async function pingDatabase(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
