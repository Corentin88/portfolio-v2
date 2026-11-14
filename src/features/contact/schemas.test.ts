import { describe, expect, it } from "vitest";
import {
  contactMessageSchema,
  parseMessageListParams,
} from "@/features/contact/schemas";

const valid = {
  name: "Marie Dupont",
  email: "marie@exemple.fr",
  subject: "Alternance",
  message: "Bonjour, j'aurais un projet à vous proposer.",
};

describe("contactMessageSchema", () => {
  it("accepte un message complet et nettoie les espaces", () => {
    const result = contactMessageSchema.parse({
      ...valid,
      name: "  Marie   Dupont ",
      email: " marie@exemple.fr ",
    });
    expect(result.name).toBe("Marie Dupont");
    expect(result.email).toBe("marie@exemple.fr");
  });

  it("rend le sujet facultatif", () => {
    expect(
      contactMessageSchema.parse({ ...valid, subject: undefined }).subject,
    ).toBe("");
  });

  it("refuse les champs obligatoires vides ou invalides", () => {
    const result = contactMessageSchema.safeParse({
      name: " ",
      email: "pas-un-email",
      subject: "",
      message: "court",
    });
    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(
      expect.arrayContaining(["name", "email", "message"]),
    );
  });

  it("borne les longueurs", () => {
    for (const patch of [
      { name: "a".repeat(101) },
      { email: `${"a".repeat(250)}@exemple.fr` },
      { subject: "s".repeat(151) },
      { message: "m".repeat(5001) },
    ]) {
      expect(
        contactMessageSchema.safeParse({ ...valid, ...patch }).success,
      ).toBe(false);
    }
  });

  it("retire les retours à la ligne du nom et du sujet (injection d'en-tête)", () => {
    const result = contactMessageSchema.parse({
      ...valid,
      name: "Marie\r\nBcc: victime@exemple.fr",
      subject: "Sujet\nX-Injected: 1",
    });
    expect(result.name).not.toMatch(/[\r\n]/);
    expect(result.subject).not.toMatch(/[\r\n]/);
  });

  it("conserve les sauts de ligne du message mais retire les autres contrôles", () => {
    const result = contactMessageSchema.parse({
      ...valid,
      message: "Ligne 1\r\nLigne 2\u0000\u0007\n\tFin",
    });
    expect(result.message).toBe("Ligne 1\nLigne 2\n\tFin");
  });

  it("refuse une adresse contenant un retour à la ligne", () => {
    expect(
      contactMessageSchema.safeParse({
        ...valid,
        email: "marie@exemple.fr\nBcc: x@y.fr",
      }).success,
    ).toBe(false);
  });
});

describe("parseMessageListParams", () => {
  it("applique les valeurs par défaut", () => {
    expect(parseMessageListParams({})).toEqual({
      page: 1,
      q: "",
      status: "all",
    });
  });

  it("lit des paramètres valides (première valeur si répétés)", () => {
    expect(
      parseMessageListParams({
        page: "3",
        q: ["  Marie   Dupont ", "x"],
        status: "handled",
      }),
    ).toEqual({ page: 3, q: "Marie Dupont", status: "handled" });
  });

  it("retombe sur les défauts pour des valeurs bricolées", () => {
    expect(
      parseMessageListParams({
        page: "-2",
        q: "a".repeat(500),
        status: "<script>",
      }),
    ).toEqual({ page: 1, q: "", status: "all" });
    expect(parseMessageListParams({ page: "abc" }).page).toBe(1);
  });
});
