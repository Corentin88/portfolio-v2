import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const adminUser = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { adminUser } }));

import {
  accountFailureDelayMs,
  authenticateAdmin,
} from "@/features/auth/authenticate";
import { hashPassword } from "@/features/auth/password";

const PASSWORD = "mot-de-passe-correct";
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

beforeEach(() => {
  adminUser.findUnique.mockReset();
  adminUser.update.mockReset();
});

function storedAdmin(email: string) {
  return {
    id: "admin-1",
    email,
    displayName: "Admin",
    passwordHash,
    sessionVersion: 3,
  };
}

describe("authenticateAdmin", () => {
  it("authentifie le compte et enregistre la date de connexion", async () => {
    adminUser.findUnique.mockResolvedValue(storedAdmin("ok@example.com"));

    const result = await authenticateAdmin(
      { email: "ok@example.com", password: PASSWORD },
      "client-ok",
    );

    expect(result).toEqual({
      ok: true,
      admin: {
        id: "admin-1",
        email: "ok@example.com",
        name: "Admin",
        sessionVersion: 3,
      },
    });
    expect(adminUser.update).toHaveBeenCalledWith({
      where: { id: "admin-1" },
      data: { lastLoginAt: expect.any(Date) },
    });
  });

  it("refuse un mauvais mot de passe sans préciser la cause", async () => {
    adminUser.findUnique.mockResolvedValue(storedAdmin("bad@example.com"));

    const result = await authenticateAdmin(
      { email: "bad@example.com", password: "erreur" },
      "client-bad",
    );

    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
    expect(adminUser.update).not.toHaveBeenCalled();
  });

  it("répond de la même façon pour un compte inconnu", async () => {
    adminUser.findUnique.mockResolvedValue(null);

    const result = await authenticateAdmin(
      { email: "inconnu@example.com", password: PASSWORD },
      "client-unknown",
    );

    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("bloque l'origine après 5 échecs, sans plus interroger la base", async () => {
    adminUser.findUnique.mockResolvedValue(storedAdmin("brute@example.com"));
    for (let i = 0; i < 5; i++) {
      await authenticateAdmin(
        { email: "brute@example.com", password: "erreur" },
        "client-brute",
      );
    }
    adminUser.findUnique.mockClear();

    const blocked = await authenticateAdmin(
      { email: "brute@example.com", password: PASSWORD },
      "client-brute",
    );

    expect(blocked).toEqual({ ok: false, reason: "rate_limited" });
    expect(adminUser.findUnique).not.toHaveBeenCalled();
  });

  it("remet les compteurs à zéro après une connexion réussie", async () => {
    adminUser.findUnique.mockResolvedValue(storedAdmin("reset@example.com"));
    for (let i = 0; i < 4; i++) {
      await authenticateAdmin(
        { email: "reset@example.com", password: "erreur" },
        "client-reset",
      );
    }
    await authenticateAdmin(
      { email: "reset@example.com", password: PASSWORD },
      "client-reset",
    );

    const afterReset = await authenticateAdmin(
      { email: "reset@example.com", password: "erreur" },
      "client-reset",
    );
    expect(afterReset).toEqual({ ok: false, reason: "invalid_credentials" });
  });
});

describe("accountFailureDelayMs", () => {
  it("n'impose aucun délai sur les premiers échecs puis double, plafonné à 15 s", () => {
    expect(accountFailureDelayMs(5)).toBe(0);
    expect(accountFailureDelayMs(6)).toBe(1000);
    expect(accountFailureDelayMs(7)).toBe(2000);
    expect(accountFailureDelayMs(30)).toBe(15_000);
  });
});
