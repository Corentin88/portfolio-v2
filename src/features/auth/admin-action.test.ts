import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const requireAdmin = vi.hoisted(() => vi.fn());
const cache = vi.hoisted(() => ({ updateTag: vi.fn(), refresh: vi.fn() }));
vi.mock("@/features/auth/require-admin", () => ({ requireAdmin }));
vi.mock("next/cache", () => cache);

import { runAdminAction } from "@/features/auth/admin-action";
import { PUBLIC_CONTENT_TAG } from "@/lib/cache-tags";
import { DomainError } from "@/lib/errors";
import { requiredText } from "@/lib/validation";

const schema = z.object({ title: requiredText(10) });

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
  cache.updateTag.mockReset();
  cache.refresh.mockReset();
});

describe("runAdminAction", () => {
  it("refuse l'action sans session, avant toute validation ou écriture", async () => {
    requireAdmin.mockRejectedValue(new Error("REDIRECT /admin/login"));
    const run = vi.fn();

    await expect(
      runAdminAction(schema, form({ title: "ok" }), run),
    ).rejects.toThrow("REDIRECT /admin/login");
    expect(run).not.toHaveBeenCalled();
    expect(cache.updateTag).not.toHaveBeenCalled();
  });

  it("renvoie les erreurs par champ et la saisie, sans rien écrire", async () => {
    const run = vi.fn();
    const result = await runAdminAction(
      schema,
      form({ title: "beaucoup trop long" }),
      run,
    );

    expect(result).toEqual({
      ok: false,
      error: "Vérifiez les champs signalés.",
      fieldErrors: { title: "10 caractères maximum." },
      values: { title: "beaucoup trop long" },
    });
    expect(run).not.toHaveBeenCalled();
    expect(cache.updateTag).not.toHaveBeenCalled();
  });

  it("transmet les données validées puis invalide le cache public", async () => {
    const run = vi.fn().mockResolvedValue("Enregistré.");
    const result = await runAdminAction(
      schema,
      form({ title: "  Titre " }),
      run,
    );

    expect(run).toHaveBeenCalledWith({ title: "Titre" });
    expect(result).toEqual({ ok: true, message: "Enregistré." });
    expect(cache.updateTag).toHaveBeenCalledWith(PUBLIC_CONTENT_TAG);
    expect(cache.refresh).toHaveBeenCalled();
  });

  it("traduit une règle métier en message, sans invalider le cache", async () => {
    const run = vi
      .fn()
      .mockRejectedValue(new DomainError("Catégorie utilisée."));
    const result = await runAdminAction(schema, form({ title: "Titre" }), run);

    expect(result).toMatchObject({ ok: false, error: "Catégorie utilisée." });
    expect(cache.updateTag).not.toHaveBeenCalled();
  });

  it("laisse remonter une erreur technique inattendue", async () => {
    const run = vi.fn().mockRejectedValue(new Error("connexion perdue"));
    await expect(
      runAdminAction(schema, form({ title: "Titre" }), run),
    ).rejects.toThrow("connexion perdue");
  });
});
