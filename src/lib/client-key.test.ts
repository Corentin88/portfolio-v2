import { describe, expect, it } from "vitest";
import { clientKeyFromHeaders } from "@/lib/client-key";

function key(forwardedFor?: string) {
  const headers = new Headers();
  if (forwardedFor !== undefined) headers.set("x-forwarded-for", forwardedFor);
  return clientKeyFromHeaders(headers);
}

describe("clientKeyFromHeaders", () => {
  it("partage une clé locale sans en-tête de proxy", () => {
    expect(key()).toBe("local");
    expect(key("  ")).toBe("local");
  });

  it("retient l'adresse posée par le proxy de confiance (dernière entrée)", () => {
    expect(key("203.0.113.7")).toBe("203.0.113.7");
    // Entrée falsifiée par le client, puis adresse réelle ajoutée par le proxy.
    expect(key("1.2.3.4, 203.0.113.7")).toBe("203.0.113.7");
    expect(key("1.2.3.4,203.0.113.7 ,")).toBe("203.0.113.7");
  });

  it("borne la longueur de la clé", () => {
    expect(key("x".repeat(500))).toHaveLength(64);
  });
});
