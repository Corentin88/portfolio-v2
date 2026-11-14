import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/features/auth/password";

describe("password", () => {
  it("produit une empreinte Argon2id avec les paramètres attendus", async () => {
    const hash = await hashPassword("un mot de passe solide");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).toContain("m=19456,t=2,p=1");
    expect(hash).not.toContain("un mot de passe solide");
  });

  it("vérifie le bon mot de passe et rejette les autres", async () => {
    const hash = await hashPassword("correct horse battery");
    await expect(verifyPassword(hash, "correct horse battery")).resolves.toBe(
      true,
    );
    await expect(verifyPassword(hash, "correct horse batterY")).resolves.toBe(
      false,
    );
  });

  it("traite une empreinte corrompue comme un échec", async () => {
    await expect(verifyPassword("pas-une-empreinte", "x")).resolves.toBe(false);
  });
});
