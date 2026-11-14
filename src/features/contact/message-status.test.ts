import { afterEach, describe, expect, it, vi } from "vitest";
import {
  messageStatus,
  messagesListHref,
  statusUpdate,
  statusWhere,
} from "@/features/contact/message-status";
import { formatRetention } from "@/features/contact/retention";
import { getContactRetentionDays } from "@/lib/env";

const date = new Date("2026-01-01");
const now = new Date("2026-02-01");

describe("messageStatus", () => {
  it("déduit le statut des dates (traité prime sur lu)", () => {
    expect(messageStatus({ readAt: null, handledAt: null })).toBe("unread");
    expect(messageStatus({ readAt: date, handledAt: null })).toBe("read");
    expect(messageStatus({ readAt: date, handledAt: date })).toBe("handled");
    expect(messageStatus({ readAt: null, handledAt: date })).toBe("handled");
  });
});

describe("statusWhere", () => {
  it("traduit chaque statut en filtre exclusif", () => {
    expect(statusWhere("unread")).toEqual({ readAt: null, handledAt: null });
    expect(statusWhere("read")).toEqual({
      readAt: { not: null },
      handledAt: null,
    });
    expect(statusWhere("handled")).toEqual({ handledAt: { not: null } });
  });
});

describe("statusUpdate", () => {
  it("non lu efface les deux dates", () => {
    expect(
      statusUpdate("unread", { readAt: date, handledAt: date }, now),
    ).toEqual({ readAt: null, handledAt: null });
  });

  it("lu conserve la première lecture et retire « traité »", () => {
    expect(
      statusUpdate("read", { readAt: date, handledAt: date }, now),
    ).toEqual({ readAt: date, handledAt: null });
    expect(
      statusUpdate("read", { readAt: null, handledAt: null }, now),
    ).toEqual({ readAt: now, handledAt: null });
  });

  it("traité implique lu", () => {
    expect(
      statusUpdate("handled", { readAt: null, handledAt: null }, now),
    ).toEqual({ readAt: now, handledAt: now });
  });
});

describe("messagesListHref", () => {
  it("omet les valeurs par défaut", () => {
    expect(messagesListHref({ page: 1, q: "", status: "all" })).toBe(
      "/admin/messages",
    );
  });

  it("encode la recherche, le statut et la page", () => {
    expect(
      messagesListHref({ page: 2, q: "Marie & co", status: "unread" }),
    ).toBe("/admin/messages?q=Marie+%26+co&status=unread&page=2");
  });
});

describe("conservation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("vaut 365 jours par défaut et ignore une valeur invalide", () => {
    vi.stubEnv("CONTACT_RETENTION_DAYS", "");
    expect(getContactRetentionDays()).toBe(365);
    for (const value of ["0", "-5", "abc", "1.5", "99999"]) {
      vi.stubEnv("CONTACT_RETENTION_DAYS", value);
      expect(getContactRetentionDays()).toBe(365);
    }
    vi.stubEnv("CONTACT_RETENTION_DAYS", "180");
    expect(getContactRetentionDays()).toBe(180);
  });

  it("s'affiche en années, mois ou jours", () => {
    expect(formatRetention(365)).toBe("1 an");
    expect(formatRetention(730)).toBe("2 ans");
    expect(formatRetention(180)).toBe("6 mois");
    expect(formatRetention(45)).toBe("45 jours");
  });
});
