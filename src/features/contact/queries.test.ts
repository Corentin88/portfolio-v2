import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({
  contactMessage: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
}));
vi.mock("@/features/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/db", () => ({ db }));

import {
  getContactMessage,
  getMessagesOverview,
  listContactMessages,
} from "@/features/contact/queries";
import { MESSAGES_PAGE_SIZE } from "@/features/contact/schemas";

const REDIRECT = new Error("NEXT_REDIRECT /admin/login");

beforeEach(() => {
  requireAdmin.mockReset().mockResolvedValue({ id: "admin-1" });
  for (const fn of Object.values(db.contactMessage)) fn.mockReset();
  db.contactMessage.findMany.mockResolvedValue([]);
  db.contactMessage.count.mockResolvedValue(0);
});

describe("protection des lectures", () => {
  it("aucune lecture sans session administrateur", async () => {
    requireAdmin.mockRejectedValue(REDIRECT);
    await expect(
      listContactMessages({ page: 1, q: "", status: "all" }),
    ).rejects.toBe(REDIRECT);
    await expect(getContactMessage("msg-1")).rejects.toBe(REDIRECT);
    await expect(getMessagesOverview()).rejects.toBe(REDIRECT);
    expect(db.contactMessage.count).not.toHaveBeenCalled();
    expect(db.contactMessage.findMany).not.toHaveBeenCalled();
    expect(db.contactMessage.findUnique).not.toHaveBeenCalled();
  });
});

describe("listContactMessages", () => {
  it("pagine du plus récent au plus ancien", async () => {
    db.contactMessage.count.mockResolvedValue(45);
    const result = await listContactMessages({ page: 2, q: "", status: "all" });

    expect(result).toMatchObject({ total: 45, page: 2, pageCount: 3 });
    expect(db.contactMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: MESSAGES_PAGE_SIZE,
        take: MESSAGES_PAGE_SIZE,
      }),
    );
  });

  it("ramène une page hors limites sur la dernière", async () => {
    db.contactMessage.count.mockResolvedValue(5);
    const result = await listContactMessages({ page: 9, q: "", status: "all" });
    expect(result.page).toBe(1);
    expect(db.contactMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 }),
    );
  });

  it("combine recherche (expéditeur, e-mail, sujet) et statut", async () => {
    await listContactMessages({ page: 1, q: "marie", status: "unread" });
    const where = {
      OR: [
        { name: { contains: "marie" } },
        { email: { contains: "marie" } },
        { subject: { contains: "marie" } },
      ],
      readAt: null,
      handledAt: null,
    };
    expect(db.contactMessage.count).toHaveBeenCalledWith({ where });
    expect(db.contactMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where }),
    );
  });

  it("filtre les messages traités", async () => {
    await listContactMessages({ page: 1, q: "", status: "handled" });
    expect(db.contactMessage.count).toHaveBeenCalledWith({
      where: { handledAt: { not: null } },
    });
  });
});

describe("consultation", () => {
  it("lit le message complet par identifiant", async () => {
    db.contactMessage.findUnique.mockResolvedValue({ id: "msg-1" });
    await getContactMessage("msg-1");
    expect(db.contactMessage.findUnique).toHaveBeenCalledWith({
      where: { id: "msg-1" },
      select: expect.objectContaining({ message: true, email: true }),
    });
  });

  it("compte les non lus et les notifications en échec", async () => {
    db.contactMessage.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    const overview = await getMessagesOverview(5);
    expect(overview).toMatchObject({ unread: 3, notNotified: 1 });
    expect(db.contactMessage.count).toHaveBeenCalledWith({
      where: { readAt: null, handledAt: null },
    });
    expect(db.contactMessage.count).toHaveBeenCalledWith({
      where: { notifiedAt: null },
    });
    expect(db.contactMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });

  it("n'interroge pas les derniers messages pour le seul compteur", async () => {
    await getMessagesOverview(0);
    expect(db.contactMessage.findMany).not.toHaveBeenCalled();
  });
});
