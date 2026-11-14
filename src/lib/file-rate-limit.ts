import { createHmac } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type RateLimitRule = {
  limit: number;
  windowMs: number;
  /** « client » : par origine ; « global » : toutes origines confondues. */
  scope: "client" | "global";
};

type FileRateLimiterOptions = {
  filePath: string;
  rules: RateLimitRule[];
  /** Clé HMAC : les adresses IP ne sont jamais écrites en clair sur le disque. */
  secret: string;
  now?: () => number;
};

export type FileRateLimiter = {
  /** Enregistre la tentative si toutes les règles l'autorisent ; false sinon. */
  consume: (clientKey: string) => Promise<boolean>;
};

type Hits = Record<string, number[]>;

const GLOBAL_KEY = "*";

async function readHits(filePath: string): Promise<Hits> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
    if (typeof parsed !== "object" || parsed === null) return {};
    const hits: Hits = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) {
        hits[key] = value.filter((time) => typeof time === "number");
      }
    }
    return hits;
  } catch (error) {
    // Fichier absent (premier envoi) ou illisible : on repart d'un état vide
    // plutôt que de bloquer le formulaire.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("[rate-limit] état illisible, réinitialisé");
    }
    return {};
  }
}

async function writeHits(filePath: string, hits: Hits): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  // Écriture atomique : un arrêt brutal ne laisse jamais un fichier tronqué.
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(hits), "utf8");
  await rename(temporary, filePath);
}

/**
 * Limiteur à fenêtre glissante persisté dans un fichier JSON : les compteurs
 * survivent aux redémarrages (volume Docker sur le VPS). Prévu pour une instance
 * unique ; les accès sont sérialisés dans le processus.
 */
export function createFileRateLimiter({
  filePath,
  rules,
  secret,
  now = Date.now,
}: FileRateLimiterOptions): FileRateLimiter {
  const longestWindow = Math.max(...rules.map((rule) => rule.windowMs));
  let queue: Promise<unknown> = Promise.resolve();

  function hashKey(clientKey: string): string {
    return createHmac("sha256", secret)
      .update(clientKey)
      .digest("hex")
      .slice(0, 32);
  }

  async function consume(clientKey: string): Promise<boolean> {
    const time = now();
    const hits = await readHits(filePath);

    // Purge des tentatives sorties de la plus longue fenêtre.
    for (const [key, times] of Object.entries(hits)) {
      const kept = times.filter((hit) => hit > time - longestWindow);
      if (kept.length > 0) hits[key] = kept;
      else delete hits[key];
    }

    const clientHash = hashKey(clientKey);
    const allowed = rules.every((rule) => {
      const times = hits[rule.scope === "global" ? GLOBAL_KEY : clientHash];
      const recent = (times ?? []).filter((hit) => hit > time - rule.windowMs);
      return recent.length < rule.limit;
    });

    if (allowed) {
      hits[clientHash] = [...(hits[clientHash] ?? []), time];
      hits[GLOBAL_KEY] = [...(hits[GLOBAL_KEY] ?? []), time];
    }
    await writeHits(filePath, hits);
    return allowed;
  }

  return {
    consume(clientKey) {
      const result = queue.then(() => consume(clientKey));
      queue = result.catch(() => undefined);
      return result;
    },
  };
}
