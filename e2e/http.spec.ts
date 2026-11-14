import { expect, test } from "@playwright/test";
import { readFixtures } from "./support/helpers";

test.describe("Réponses HTTP", () => {
  test("en-têtes de sécurité sur les pages", async ({ request }) => {
    const response = await request.get("/");
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("vrai 404 : projet inconnu, brouillon, slug invalide, page inexistante", async ({
    request,
  }) => {
    for (const path of [
      "/projets/projet-inconnu",
      "/projets/projet-brouillon",
      "/projets/Slug%20Invalide",
      "/page-inexistante",
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
      expect(await response.text()).toContain("Page introuvable");
    }
  });

  test("projet publié : 200, canonique et Open Graph", async ({ request }) => {
    const response = await request.get("/projets/atlas-demo");
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(
      'rel="canonical" href="http://localhost:3100/projets/atlas-demo"',
    );
    expect(html).toContain('property="og:title" content="Atlas Démo"');
  });

  test("robots.txt et sitemap.xml", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap: http://localhost:3100/sitemap.xml");

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("<loc>http://localhost:3100/</loc>");
    expect(sitemap).toContain("/projets/atlas-demo</loc>");
    expect(sitemap).toContain("/projets/borealis-demo</loc>");
    expect(sitemap).not.toContain("projet-brouillon");
  });

  test("administration non indexable", async ({ request }) => {
    const html = await (await request.get("/admin/login")).text();
    expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
  });

  test("médias : publics servis, brouillons et clés invalides en 404", async ({
    request,
  }) => {
    const { publicShot, draftShot } = readFixtures();

    const shot = await request.get(`/media/${publicShot}`);
    expect(shot.status()).toBe(200);
    expect(shot.headers()["content-type"]).toBe("image/webp");
    expect(shot.headers()["x-content-type-options"]).toBe("nosniff");
    expect(shot.headers()["cache-control"]).toBe("public, max-age=600");

    for (const path of [
      `/media/${draftShot}`,
      "/media/images/2026/01/00000000000000000000000000000000.webp",
      "/media/..%2F..%2Fpackage.json",
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
      expect(response.headers()["cache-control"]).toBe("private, no-store");
    }
  });
});
