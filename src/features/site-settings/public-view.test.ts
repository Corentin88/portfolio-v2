import { describe, expect, it } from "vitest";
import {
  isPlaceholderEmail,
  toPublicSiteSettings,
  type SiteSettingsRow,
} from "@/features/site-settings/public-view";

const row: SiteSettingsRow = {
  heroStatusLabel: "Disponible",
  heroRoleLine: "Développeur",
  heroTagline: "Accroche",
  heroTaglineSub: "Sous-accroche",
  presentationTitle: "Titre",
  presentationBody:
    "Premier paragraphe.\n\nDeuxième paragraphe.\r\n\r\n\n  Troisième.  ",
  presentationQuote: "  ",
  contactEmail: "contact@example.com",
  availabilityNote: null,
  linkedinUrl: null,
  githubUrl: "https://github.com/Corentin88",
  seoTitle: "Titre SEO",
  seoDescription: "Description SEO",
  ogImageMedia: null,
  profilePhotoMedia: null,
  cvMediaId: null,
};

describe("isPlaceholderEmail", () => {
  it("reconnaît les domaines réservés aux exemples", () => {
    for (const email of [
      "contact@example.com",
      "a@sub.example.org",
      "x@site.test",
      "y@foo.invalid",
      "z@localhost",
    ]) {
      expect(isPlaceholderEmail(email)).toBe(true);
    }
  });

  it("accepte une adresse réelle", () => {
    expect(isPlaceholderEmail("corentin@exemple-reel.fr")).toBe(false);
    expect(isPlaceholderEmail("hello@notexample.com")).toBe(false);
  });
});

describe("toPublicSiteSettings", () => {
  it("n'expose le CV et l'image de partage que s'ils sont définis", () => {
    const empty = toPublicSiteSettings(row);
    expect(empty.cvUrl).toBeNull();
    expect(empty.seo.image).toBeNull();

    const view = toPublicSiteSettings({
      ...row,
      cvMediaId: "media-cv",
      ogImageMedia: {
        storageKey: "images/2026/11/0123456789abcdef0123456789abcdef.webp",
        width: 1200,
        height: 630,
        alt: "Aperçu du portfolio",
      },
    });
    expect(view.cvUrl).toBe("/cv");
    expect(view.seo.image).toEqual({
      src: "/media/images/2026/11/0123456789abcdef0123456789abcdef.webp",
      width: 1200,
      height: 630,
      alt: "Aperçu du portfolio",
    });
  });

  it("masque une adresse de contact provisoire", () => {
    expect(toPublicSiteSettings(row).contactEmail).toBeNull();
    expect(
      toPublicSiteSettings({ ...row, contactEmail: " moi@domaine.fr " })
        .contactEmail,
    ).toBe("moi@domaine.fr");
  });

  it("découpe la présentation en paragraphes non vides", () => {
    expect(toPublicSiteSettings(row).presentation.paragraphs).toEqual([
      "Premier paragraphe.",
      "Deuxième paragraphe.",
      "Troisième.",
    ]);
  });

  it("ignore une citation vide", () => {
    expect(toPublicSiteSettings(row).presentation.quote).toBeNull();
  });

  it("affiche les initiales sans photo de profil", () => {
    expect(toPublicSiteSettings(row).presentation.photo).toBeNull();
  });

  it("expose la photo de profil en miniature avec son texte alternatif", () => {
    const photo = toPublicSiteSettings({
      ...row,
      profilePhotoMedia: {
        storageKey: `images/2026/11/${"b".repeat(32)}.webp`,
        width: 1920,
        height: 2400,
        alt: "Portrait de Corentin Lanaud",
      },
    }).presentation.photo;
    expect(photo).toMatchObject({
      width: 768,
      height: 960,
      alt: "Portrait de Corentin Lanaud",
    });
    expect(photo?.src).toMatch(/\.w960\.webp$/);
  });

  it("n'expose que des liens http(s) valides", () => {
    const view = toPublicSiteSettings({
      ...row,
      linkedinUrl: "javascript:alert(1)",
    });
    expect(view.linkedinUrl).toBeNull();
    expect(view.githubUrl).toBe("https://github.com/Corentin88");
  });
});
