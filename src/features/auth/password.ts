import { hash, verify } from "@node-rs/argon2";

// Argon2id (algorithme par défaut de @node-rs/argon2) avec les paramètres
// minimaux recommandés par l'OWASP : 19 Mio de mémoire, 2 itérations, 1 fil.
const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    // Empreinte corrompue ou illisible : traitée comme un échec, sans détail.
    return false;
  }
}
