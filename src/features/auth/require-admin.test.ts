import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

import { requireAdmin } from "@/features/auth/require-admin";

beforeEach(() => auth.mockReset());

describe("requireAdmin", () => {
  it("redirige vers la connexion sans session", async () => {
    auth.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("REDIRECT /admin/login");
  });

  it("redirige vers la connexion si la session n'identifie pas l'administrateur", async () => {
    auth.mockResolvedValue({ user: { email: "a@example.com" } });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT /admin/login");
  });

  it("renvoie l'administrateur courant avec une session valide", async () => {
    auth.mockResolvedValue({
      user: { id: "admin-1", name: "Admin", email: "a@example.com" },
    });
    await expect(requireAdmin()).resolves.toEqual({
      id: "admin-1",
      name: "Admin",
      email: "a@example.com",
    });
  });
});
