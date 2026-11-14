import { describe, expect, it } from "vitest";
import { siteUrlFromHeaders } from "@/lib/site-url";

const origin = (headers: Record<string, string>) =>
  siteUrlFromHeaders(new Headers(headers))?.origin ?? null;

describe("siteUrlFromHeaders", () => {
  it("utilise l'hôte et le protocole transmis par le proxy", () => {
    expect(
      origin({
        host: "app:3000",
        "x-forwarded-host": "exemple.fr",
        "x-forwarded-proto": "https",
      }),
    ).toBe("https://exemple.fr");
  });

  it("http en local, https par défaut ailleurs", () => {
    expect(origin({ host: "localhost:3000" })).toBe("http://localhost:3000");
    expect(origin({ host: "exemple.fr" })).toBe("https://exemple.fr");
  });

  it("rejette un hôte ou un protocole invalide", () => {
    expect(origin({})).toBeNull();
    expect(origin({ host: "a b" })).toBeNull();
    expect(
      origin({ host: "exemple.fr", "x-forwarded-proto": "javascript" }),
    ).toBeNull();
  });
});
