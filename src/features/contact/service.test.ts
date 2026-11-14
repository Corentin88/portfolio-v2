import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  contactMessage: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}));
vi.mock("@/lib/db", () => ({ db }));

import { DomainError } from "@/lib/errors";
import { MailDeliveryError, type Mailer, type MailMessage } from "@/lib/mailer";
import {
  CONTACT_MESSAGES,
  MIN_FILL_TIME_MS,
  deleteMessage,
  markMessageAsRead,
  purgeExpiredMessages,
  resendNotification,
  setMessageStatus,
  submitContactMessage,
  type ContactDependencies,
} from "@/features/contact/service";

const NOW = 1_800_000_000_000;
const SUBMISSION_ID = "0b6d3f6e-8a51-4c1e-9f3a-2d7c5e4b1a90";

const form = {
  name: "Marie Dupont",
  email: "marie@exemple.fr",
  subject: "Alternance",
  message: "Bonjour, j'aurais un projet à vous proposer.",
  website: "",
  startedAt: String(NOW - 10_000),
  submissionId: SUBMISSION_ID,
};

const stored = {
  id: "msg-1",
  name: form.name,
  email: form.email,
  subject: form.subject,
  message: form.message,
  createdAt: new Date(NOW),
};

const prismaError = (code: string) => Object.assign(new Error(code), { code });

function setup(overrides: Partial<ContactDependencies> = {}) {
  const sent: MailMessage[] = [];
  const mailer: Mailer = {
    send: vi.fn(async (message: MailMessage) => {
      sent.push(message);
    }),
  };
  const consumeRateLimit = vi.fn(async () => true);
  const deps: ContactDependencies = {
    mailer,
    from: "Portfolio <contact@domaine.fr>",
    recipient: "moi@domaine.fr",
    consumeRateLimit,
    retentionDays: 365,
    now: () => NOW,
    ...overrides,
  };
  return { deps, sent, consumeRateLimit };
}

beforeEach(() => {
  for (const fn of Object.values(db.contactMessage)) fn.mockReset();
  db.contactMessage.findUnique.mockResolvedValue(null);
  db.contactMessage.create.mockResolvedValue(stored);
  db.contactMessage.update.mockResolvedValue({});
  db.contactMessage.deleteMany.mockResolvedValue({ count: 0 });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("submitContactMessage — enregistrement et notification", () => {
  it("enregistre le message, notifie le propriétaire et date la notification", async () => {
    const { deps, sent, consumeRateLimit } = setup();
    const result = await submitContactMessage(form, "1.2.3.4", deps);

    expect(result).toEqual({ ok: true, message: CONTACT_MESSAGES.sent });
    expect(consumeRateLimit).toHaveBeenCalledWith("1.2.3.4");
    expect(db.contactMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          submissionId: SUBMISSION_ID,
          name: "Marie Dupont",
          email: "marie@exemple.fr",
          subject: "Alternance",
          message: form.message,
          createdAt: new Date(NOW),
        },
      }),
    );
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      from: "Portfolio <contact@domaine.fr>",
      to: "moi@domaine.fr",
      replyTo: "marie@exemple.fr",
      subject: "[Portfolio] Alternance — Marie Dupont",
    });
    expect(db.contactMessage.update).toHaveBeenCalledWith({
      where: { id: "msg-1" },
      data: { notifiedAt: expect.any(Date) },
    });
  });

  it("enregistre un sujet vide comme null", async () => {
    const { deps } = setup();
    await submitContactMessage({ ...form, subject: "  " }, "ip", deps);
    expect(db.contactMessage.create.mock.calls[0]?.[0].data.subject).toBeNull();
  });

  it("purge les messages expirés après un enregistrement", async () => {
    const { deps } = setup({ retentionDays: 30 });
    await submitContactMessage(form, "ip", deps);
    expect(db.contactMessage.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date(NOW - 30 * 86_400_000) } },
    });
  });

  it("une purge en échec n'empêche pas le succès", async () => {
    db.contactMessage.deleteMany.mockRejectedValue(new Error("db"));
    const { deps } = setup();
    expect((await submitContactMessage(form, "ip", deps)).ok).toBe(true);
  });
});

describe("submitContactMessage — robots et saisies", () => {
  it("honeypot rempli : faux succès, rien d'enregistré, envoyé ni décompté", async () => {
    const { deps, sent, consumeRateLimit } = setup();
    const result = await submitContactMessage(
      { ...form, website: "https://spam.example" },
      "ip",
      deps,
    );
    expect(result.ok).toBe(true);
    expect(db.contactMessage.findUnique).not.toHaveBeenCalled();
    expect(db.contactMessage.create).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
    expect(consumeRateLimit).not.toHaveBeenCalled();
  });

  it("soumission trop rapide : erreur explicite et saisie conservée, rien d'enregistré", async () => {
    for (const startedAt of [String(NOW - MIN_FILL_TIME_MS + 1), "", "abc"]) {
      const { deps, sent } = setup();
      const result = await submitContactMessage(
        { ...form, startedAt },
        "ip",
        deps,
      );
      expect(result).toMatchObject({
        ok: false,
        error: CONTACT_MESSAGES.tooFast,
        values: { message: form.message },
      });
      expect(sent).toHaveLength(0);
    }
    expect(db.contactMessage.create).not.toHaveBeenCalled();
  });

  it("données invalides : erreurs par champ, rien enregistré ni décompté", async () => {
    const { deps, consumeRateLimit } = setup();
    const result = await submitContactMessage(
      { ...form, email: "invalide", message: "court" },
      "ip",
      deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors).toHaveProperty("email");
    expect(result.fieldErrors).toHaveProperty("message");
    expect(result.values).toEqual({
      name: form.name,
      email: "invalide",
      subject: form.subject,
      message: "court",
    });
    expect(db.contactMessage.create).not.toHaveBeenCalled();
    expect(consumeRateLimit).not.toHaveBeenCalled();
  });

  it("clé de soumission absente ou invalide : formulaire expiré", async () => {
    for (const submissionId of ["", "pas-un-uuid"]) {
      const { deps } = setup();
      const result = await submitContactMessage(
        { ...form, submissionId },
        "ip",
        deps,
      );
      expect(result).toMatchObject({
        ok: false,
        error: CONTACT_MESSAGES.expired,
      });
    }
    expect(db.contactMessage.create).not.toHaveBeenCalled();
  });

  it("limite atteinte : message explicite, rien d'enregistré", async () => {
    const { deps, sent } = setup({ consumeRateLimit: async () => false });
    const result = await submitContactMessage(form, "ip", deps);
    expect(result).toMatchObject({
      ok: false,
      error: CONTACT_MESSAGES.rateLimited,
    });
    expect(db.contactMessage.create).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });
});

describe("submitContactMessage — doublons", () => {
  it("nouvelle tentative avec la même clé : succès sans doublon ni second e-mail", async () => {
    db.contactMessage.findUnique.mockResolvedValue({ id: "msg-1" });
    const { deps, sent, consumeRateLimit } = setup();
    const result = await submitContactMessage(form, "ip", deps);

    expect(result.ok).toBe(true);
    expect(db.contactMessage.findUnique).toHaveBeenCalledWith({
      where: { submissionId: SUBMISSION_ID },
      select: { id: true },
    });
    expect(db.contactMessage.create).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
    expect(consumeRateLimit).not.toHaveBeenCalled();
  });

  it("double soumission concurrente (contrainte unique) : succès sans second e-mail", async () => {
    db.contactMessage.create.mockRejectedValue(prismaError("P2002"));
    const { deps, sent } = setup();
    const result = await submitContactMessage(form, "ip", deps);
    expect(result).toEqual({ ok: true, message: CONTACT_MESSAGES.sent });
    expect(sent).toHaveLength(0);
  });

  it("échec d'enregistrement : erreur explicite, aucun e-mail", async () => {
    db.contactMessage.create.mockRejectedValue(new Error("connexion perdue"));
    const { deps, sent } = setup();
    const result = await submitContactMessage(form, "ip", deps);
    expect(result).toMatchObject({ ok: false, error: CONTACT_MESSAGES.failed });
    if (!result.ok) expect(result.values?.message).toBe(form.message);
    expect(sent).toHaveLength(0);
  });

  it("base indisponible dès la vérification du doublon : erreur explicite, saisie conservée", async () => {
    db.contactMessage.findUnique.mockRejectedValue(new Error("ECONNREFUSED"));
    const { deps, sent, consumeRateLimit } = setup();
    const result = await submitContactMessage(form, "ip", deps);
    expect(result).toMatchObject({ ok: false, error: CONTACT_MESSAGES.failed });
    if (!result.ok) expect(result.values?.message).toBe(form.message);
    expect(consumeRateLimit).not.toHaveBeenCalled();
    expect(db.contactMessage.create).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  it("stockage des compteurs en échec : refus explicite (fail closed), rien d'enregistré", async () => {
    const { deps, sent } = setup({
      consumeRateLimit: vi.fn(async () => {
        throw new Error("ENOSPC");
      }),
    });
    const result = await submitContactMessage(form, "ip", deps);
    expect(result).toMatchObject({ ok: false, error: CONTACT_MESSAGES.failed });
    expect(db.contactMessage.create).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });
});

describe("submitContactMessage — erreurs Resend", () => {
  it("échec du fournisseur : message conservé, succès réel, notification non datée", async () => {
    const { deps } = setup({
      mailer: {
        send: async () => {
          throw new MailDeliveryError(500, "internal_server_error");
        },
      },
    });
    const result = await submitContactMessage(form, "ip", deps);

    expect(result).toEqual({ ok: true, message: CONTACT_MESSAGES.sent });
    expect(db.contactMessage.create).toHaveBeenCalledOnce();
    expect(db.contactMessage.update).not.toHaveBeenCalled();
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toContain("500");
    expect(logged).not.toContain(form.email);
    expect(logged).not.toContain(form.message);
  });

  it("erreur inattendue du client : aucun détail technique journalisé", async () => {
    const { deps } = setup({
      mailer: {
        send: async () => {
          throw new Error("détail interne sensible");
        },
      },
    });
    expect((await submitContactMessage(form, "ip", deps)).ok).toBe(true);
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).not.toContain(
      "sensible",
    );
  });

  it("envoi non configuré : message enregistré quand même, non notifié", async () => {
    for (const overrides of [
      { mailer: null },
      { from: null },
      { recipient: null },
    ]) {
      db.contactMessage.create.mockClear();
      const { deps } = setup(overrides);
      expect((await submitContactMessage(form, "ip", deps)).ok).toBe(true);
      expect(db.contactMessage.create).toHaveBeenCalledOnce();
    }
    expect(db.contactMessage.update).not.toHaveBeenCalled();
  });

  it("e-mail parti mais datation impossible : le visiteur voit le succès", async () => {
    db.contactMessage.update.mockRejectedValue(new Error("db"));
    const { deps, sent } = setup();
    expect((await submitContactMessage(form, "ip", deps)).ok).toBe(true);
    expect(sent).toHaveLength(1);
  });
});

describe("administration des messages", () => {
  const mail = () => setup().deps;

  it("change le statut en conservant la première lecture", async () => {
    const readAt = new Date("2026-01-01");
    const now = new Date("2026-02-01");
    db.contactMessage.findUnique.mockResolvedValue({ readAt, handledAt: null });
    await setMessageStatus("msg-1", "handled", now);
    expect(db.contactMessage.update).toHaveBeenCalledWith({
      where: { id: "msg-1" },
      data: { readAt, handledAt: now },
    });
  });

  it("refuse un changement de statut sur un message absent", async () => {
    await expect(setMessageStatus("absent", "read")).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(db.contactMessage.update).not.toHaveBeenCalled();
  });

  it("ne marque comme lu qu'un message non lu", async () => {
    const now = new Date(NOW);
    await markMessageAsRead("msg-1", now);
    expect(db.contactMessage.updateMany).toHaveBeenCalledWith({
      where: { id: "msg-1", readAt: null },
      data: { readAt: now },
    });
  });

  it("supprime définitivement un message", async () => {
    db.contactMessage.deleteMany.mockResolvedValue({ count: 1 });
    await deleteMessage("msg-1");
    expect(db.contactMessage.deleteMany).toHaveBeenCalledWith({
      where: { id: "msg-1" },
    });
  });

  it("signale la suppression d'un message déjà supprimé", async () => {
    await expect(deleteMessage("absent")).rejects.toBeInstanceOf(DomainError);
  });

  it("purge selon la durée de conservation", async () => {
    db.contactMessage.deleteMany.mockResolvedValue({ count: 3 });
    expect(await purgeExpiredMessages(365, NOW)).toBe(3);
    expect(db.contactMessage.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date(NOW - 365 * 86_400_000) } },
    });
  });

  it("relance une notification en échec puis la date", async () => {
    db.contactMessage.findUnique.mockResolvedValue({
      ...stored,
      notifiedAt: null,
    });
    const deps = mail();
    await resendNotification("msg-1", deps);
    expect(deps.mailer?.send).toHaveBeenCalledOnce();
    expect(db.contactMessage.update).toHaveBeenCalledWith({
      where: { id: "msg-1" },
      data: { notifiedAt: expect.any(Date) },
    });
  });

  it("refuse de renvoyer une notification déjà partie", async () => {
    db.contactMessage.findUnique.mockResolvedValue({
      ...stored,
      notifiedAt: new Date(),
    });
    const deps = mail();
    await expect(resendNotification("msg-1", deps)).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(deps.mailer?.send).not.toHaveBeenCalled();
  });

  it("signale un nouvel échec du fournisseur lors de la relance", async () => {
    db.contactMessage.findUnique.mockResolvedValue({
      ...stored,
      notifiedAt: null,
    });
    const deps = setup({
      mailer: {
        send: async () => {
          throw new MailDeliveryError(503);
        },
      },
    }).deps;
    await expect(resendNotification("msg-1", deps)).rejects.toThrow(
      /n'a pas pu être envoyé/,
    );
  });
});
