import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createFileRateLimiter,
  type RateLimitRule,
} from "@/lib/file-rate-limit";

const MINUTE = 60_000;
const rules: RateLimitRule[] = [
  { scope: "client", limit: 2, windowMs: 10 * MINUTE },
  { scope: "global", limit: 3, windowMs: 60 * MINUTE },
];

let dir: string;
let filePath: string;
let time: number;

function limiter() {
  return createFileRateLimiter({
    filePath,
    rules,
    secret: "secret-de-test",
    now: () => time,
  });
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "rate-limit-"));
  filePath = path.join(dir, "state", "contact.json");
  time = 1_000_000_000;
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("createFileRateLimiter", () => {
  it("bloque un client au-delà de sa limite puis le libère après la fenêtre", async () => {
    const limit = limiter();
    expect(await limit.consume("1.2.3.4")).toBe(true);
    expect(await limit.consume("1.2.3.4")).toBe(true);
    expect(await limit.consume("1.2.3.4")).toBe(false);

    time += 10 * MINUTE + 1;
    expect(await limit.consume("1.2.3.4")).toBe(true);
  });

  it("applique le plafond global à tous les clients", async () => {
    const limit = limiter();
    expect(await limit.consume("a")).toBe(true);
    expect(await limit.consume("b")).toBe(true);
    expect(await limit.consume("c")).toBe(true);
    expect(await limit.consume("d")).toBe(false);
  });

  it("persiste les compteurs entre deux instances (redémarrage)", async () => {
    await limiter().consume("1.2.3.4");
    await limiter().consume("1.2.3.4");
    expect(await limiter().consume("1.2.3.4")).toBe(false);
  });

  it("n'écrit jamais l'adresse IP en clair", async () => {
    await limiter().consume("203.0.113.42");
    const content = await readFile(filePath, "utf8");
    expect(content).not.toContain("203.0.113.42");
  });

  it("sérialise les accès concurrents", async () => {
    const limit = limiter();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => limit.consume("1.2.3.4")),
    );
    expect(results.filter(Boolean)).toHaveLength(2);
  });

  it("repart d'un état vide si le fichier est corrompu", async () => {
    await limiter().consume("x");
    await writeFile(filePath, "{pas du json", "utf8");
    expect(await limiter().consume("x")).toBe(true);
  });
});
