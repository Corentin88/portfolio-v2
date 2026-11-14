type RateLimiterOptions = {
  /** Nombre d'échecs tolérés dans la fenêtre. */
  limit: number;
  windowMs: number;
  now?: () => number;
};

export type RateLimiter = {
  /** Nombre d'échecs enregistrés pour cette clé dans la fenêtre courante. */
  failures: (key: string) => number;
  isBlocked: (key: string) => boolean;
  recordFailure: (key: string) => void;
  reset: (key: string) => void;
};

/**
 * Limiteur en mémoire à fenêtre glissante. Suffisant pour une instance unique
 * (portfolio sur un seul conteneur) ; les compteurs repartent de zéro au redémarrage.
 */
export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: RateLimiterOptions): RateLimiter {
  const attempts = new Map<string, number[]>();

  function recent(key: string): number[] {
    const threshold = now() - windowMs;
    const kept = (attempts.get(key) ?? []).filter((time) => time > threshold);
    if (kept.length > 0) attempts.set(key, kept);
    else attempts.delete(key);
    return kept;
  }

  return {
    failures: (key) => recent(key).length,
    isBlocked: (key) => recent(key).length >= limit,
    recordFailure: (key) => {
      attempts.set(key, [...recent(key), now()]);
    },
    reset: (key) => {
      attempts.delete(key);
    },
  };
}
