import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

function limiterAt(start: number) {
  let now = start;
  const limiter = createRateLimiter({
    limit: 3,
    windowMs: 1000,
    now: () => now,
  });
  return { limiter, advance: (ms: number) => (now += ms) };
}

describe("createRateLimiter", () => {
  it("bloque une clé après le nombre d'échecs autorisé", () => {
    const { limiter } = limiterAt(0);
    for (let i = 0; i < 3; i++) limiter.recordFailure("ip");
    expect(limiter.isBlocked("ip")).toBe(true);
    expect(limiter.isBlocked("autre-ip")).toBe(false);
  });

  it("oublie les échecs sortis de la fenêtre", () => {
    const { limiter, advance } = limiterAt(0);
    for (let i = 0; i < 3; i++) limiter.recordFailure("ip");
    advance(1001);
    expect(limiter.failures("ip")).toBe(0);
    expect(limiter.isBlocked("ip")).toBe(false);
  });

  it("remet le compteur à zéro sur demande", () => {
    const { limiter } = limiterAt(0);
    limiter.recordFailure("ip");
    limiter.reset("ip");
    expect(limiter.failures("ip")).toBe(0);
  });
});
