import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.hoisted(() => vi.fn());
const cache = vi.hoisted(() => ({ updateTag: vi.fn(), refresh: vi.fn() }));
const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
const service = vi.hoisted(() => ({
  deleteMessage: vi.fn(),
  markMessageAsRead: vi.fn(),
  resendNotification: vi.fn(),
  setMessageStatus: vi.fn(),
  submitContactMessage: vi.fn(),
}));
const delivery = vi.hoisted(() => ({
  loadMailSettings: vi.fn(),
  getContactRateLimiter: vi.fn(),
}));
vi.mock("@/features/auth/require-admin", () => ({ requireAdmin }));
vi.mock("next/cache", () => cache);
vi.mock("next/navigation", () => navigation);
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/features/contact/service", () => service);
vi.mock("@/features/contact/delivery", () => delivery);

import {
  deleteMessageAction,
  markMessageAsReadAction,
  resendNotificationAction,
  sendContactMessage,
  setMessageStatusAction,
} from "@/features/contact/actions";
import { DomainError } from "@/lib/errors";

const REDIRECT = new Error("NEXT_REDIRECT /admin/login");

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
  for (const fn of [...Object.values(service), ...Object.values(cache)]) {
    fn.mockReset();
  }
  navigation.redirect.mockClear();
  delivery.loadMailSettings.mockResolvedValue({
    mailer: null,
    from: null,
    recipient: null,
  });
});

describe("protection des actions d'administration", () => {
  it("refuse toute mutation sans session, avant validation ou écriture", async () => {
    requireAdmin.mockRejectedValue(REDIRECT);
    await expect(
      setMessageStatusAction(null, form({ id: "msg-1", status: "read" })),
    ).rejects.toBe(REDIRECT);
    await expect(deleteMessageAction(null, form({ id: "msg-1" }))).rejects.toBe(
      REDIRECT,
    );
    await expect(
      resendNotificationAction(null, form({ id: "msg-1" })),
    ).rejects.toBe(REDIRECT);
    await expect(markMessageAsReadAction("msg-1")).rejects.toBe(REDIRECT);

    expect(service.setMessageStatus).not.toHaveBeenCalled();
    expect(service.deleteMessage).not.toHaveBeenCalled();
    expect(service.resendNotification).not.toHaveBeenCalled();
    expect(service.markMessageAsRead).not.toHaveBeenCalled();
  });
});

describe("actions d'administration", () => {
  it("valide le statut demandé", async () => {
    const result = await setMessageStatusAction(
      null,
      form({ id: "msg-1", status: "archivé" }),
    );
    expect(result.ok).toBe(false);
    expect(service.setMessageStatus).not.toHaveBeenCalled();
  });

  it("change le statut sans invalider le cache public", async () => {
    const result = await setMessageStatusAction(
      null,
      form({ id: "msg-1", status: "handled" }),
    );
    expect(result).toEqual({
      ok: true,
      message: "Message marqué comme traité.",
    });
    expect(service.setMessageStatus).toHaveBeenCalledWith("msg-1", "handled");
    expect(cache.updateTag).not.toHaveBeenCalled();
    expect(cache.refresh).toHaveBeenCalled();
  });

  it("supprime puis revient à la liste", async () => {
    await expect(
      deleteMessageAction(null, form({ id: "msg-1" })),
    ).rejects.toThrow("NEXT_REDIRECT /admin/messages");
    expect(service.deleteMessage).toHaveBeenCalledWith("msg-1");
  });

  it("signale un message déjà supprimé sans rediriger", async () => {
    service.deleteMessage.mockRejectedValue(new DomainError("Introuvable."));
    const result = await deleteMessageAction(null, form({ id: "msg-1" }));
    expect(result).toMatchObject({ ok: false, error: "Introuvable." });
    expect(navigation.redirect).not.toHaveBeenCalled();
  });

  it("relance la notification avec la configuration d'envoi", async () => {
    const result = await resendNotificationAction(null, form({ id: "msg-1" }));
    expect(result.ok).toBe(true);
    expect(service.resendNotification).toHaveBeenCalledWith(
      "msg-1",
      expect.objectContaining({ mailer: null }),
    );
  });

  it("ignore un identifiant invalide à l'ouverture", async () => {
    await markMessageAsReadAction("");
    expect(service.markMessageAsRead).not.toHaveBeenCalled();
  });
});

describe("formulaire public", () => {
  it("ne demande pas de session et transmet la saisie au service", async () => {
    service.submitContactMessage.mockResolvedValue({ ok: true, message: "ok" });
    delivery.getContactRateLimiter.mockReturnValue({ consume: vi.fn() });
    const result = await sendContactMessage(null, form({ name: "Marie" }));

    expect(result.ok).toBe(true);
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(service.submitContactMessage).toHaveBeenCalledWith(
      { name: "Marie" },
      "local",
      expect.objectContaining({ retentionDays: 365 }),
    );
  });
});
