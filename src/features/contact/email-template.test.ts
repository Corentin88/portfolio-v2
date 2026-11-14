import { describe, expect, it } from "vitest";
import {
  buildContactEmail,
  escapeHtml,
} from "@/features/contact/email-template";

const receivedAt = new Date("2026-11-14T10:30:00Z");

describe("buildContactEmail", () => {
  it("compose l'objet à partir du sujet et du nom", () => {
    const email = buildContactEmail(
      {
        name: "Marie",
        email: "marie@exemple.fr",
        subject: "Alternance",
        message: "Bonjour",
      },
      receivedAt,
    );
    expect(email.subject).toBe("[Portfolio] Alternance — Marie");
  });

  it("utilise un objet par défaut sans sujet", () => {
    const email = buildContactEmail(
      { name: "Marie", email: "m@exemple.fr", subject: "", message: "Bonjour" },
      receivedAt,
    );
    expect(email.subject).toBe("[Portfolio] Nouveau message — Marie");
  });

  it("échappe tout contenu saisi dans la version HTML", () => {
    const email = buildContactEmail(
      {
        name: '<img src=x onerror="alert(1)">',
        email: "m@exemple.fr",
        subject: "<script>alert(1)</script>",
        message: "Ligne 1\n<b>gras</b> & 'quote'",
      },
      receivedAt,
    );
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img");
    expect(email.html).not.toContain("<b>gras");
    expect(email.html).toContain(
      "&lt;b&gt;gras&lt;/b&gt; &amp; &#39;quote&#39;",
    );
    expect(email.html).toContain("Ligne 1<br>");
  });

  it("fournit une alternative texte complète", () => {
    const email = buildContactEmail(
      {
        name: "Marie",
        email: "marie@exemple.fr",
        subject: "",
        message: "Bonjour\nà bientôt",
      },
      receivedAt,
    );
    expect(email.text).toContain("De : Marie");
    expect(email.text).toContain("E-mail : marie@exemple.fr");
    expect(email.text).toContain("Bonjour\nà bientôt");
  });
});

describe("escapeHtml", () => {
  it("échappe les cinq caractères spéciaux", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });
});
