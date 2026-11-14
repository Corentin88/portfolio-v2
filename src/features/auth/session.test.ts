import { beforeEach, describe, expect, it, vi } from "vitest";

const adminUser = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { adminUser } }));

import {
  SESSION_ABSOLUTE_LIFETIME_MS,
  refreshAdminToken,
  revokeAdminSessions,
} from "@/features/auth/session";

const NOW = 1_800_000_000_000;
const validToken = {
  sub: "admin-1",
  adminId: "admin-1",
  sessionVersion: 2,
  loginAt: NOW - 60_000,
};

beforeEach(() => {
  adminUser.findUnique.mockReset();
  adminUser.update.mockReset();
});

describe("refreshAdminToken — connexion", () => {
  it("fige l'identité, la version de session et l'heure de connexion", async () => {
    const token = await refreshAdminToken(
      { sub: "admin-1" },
      { id: "admin-1", sessionVersion: 4 },
      NOW,
    );
    expect(token).toEqual({
      sub: "admin-1",
      adminId: "admin-1",
      sessionVersion: 4,
      loginAt: NOW,
    });
  });

  it("refuse une connexion sans version de session", async () => {
    await expect(
      refreshAdminToken({}, { id: "admin-1" }, NOW),
    ).resolves.toBeNull();
  });
});

describe("refreshAdminToken — requêtes suivantes", () => {
  it("conserve une session dont la version correspond à la base", async () => {
    adminUser.findUnique.mockResolvedValue({ sessionVersion: 2 });
    await expect(refreshAdminToken(validToken, undefined, NOW)).resolves.toBe(
      validToken,
    );
  });

  it("invalide une session révoquée (version incrémentée)", async () => {
    adminUser.findUnique.mockResolvedValue({ sessionVersion: 3 });
    await expect(
      refreshAdminToken(validToken, undefined, NOW),
    ).resolves.toBeNull();
  });

  it("invalide la session d'un compte supprimé", async () => {
    adminUser.findUnique.mockResolvedValue(null);
    await expect(
      refreshAdminToken(validToken, undefined, NOW),
    ).resolves.toBeNull();
  });

  it("invalide une session plus ancienne que la durée de vie absolue", async () => {
    const old = {
      ...validToken,
      loginAt: NOW - SESSION_ABSOLUTE_LIFETIME_MS - 1,
    };
    await expect(refreshAdminToken(old, undefined, NOW)).resolves.toBeNull();
    expect(adminUser.findUnique).not.toHaveBeenCalled();
  });

  it("invalide un jeton sans revendications d'administrateur", async () => {
    await expect(
      refreshAdminToken({ sub: "x" }, undefined, NOW),
    ).resolves.toBeNull();
  });
});

describe("revokeAdminSessions", () => {
  it("incrémente la version de session du compte", async () => {
    await revokeAdminSessions("admin-1");
    expect(adminUser.update).toHaveBeenCalledWith({
      where: { id: "admin-1" },
      data: { sessionVersion: { increment: 1 } },
    });
  });
});
