import { expect, test } from "@playwright/test";

/**
 * Diagnostic de performance en local (build de production, sans réseau réel) :
 * seuils larges, mesures journalisées. Ne remplace pas une mesure terrain (lot 10).
 */
test.describe("Performances (diagnostic)", () => {
  for (const path of ["/", "/projets/atlas-demo"]) {
    test(`LCP, CLS et poids JavaScript — ${path}`, async ({
      page,
    }, testInfo) => {
      await page.addInitScript(() => {
        const store = { lcp: 0, cls: 0 };
        (window as unknown as { __vitals: typeof store }).__vitals = store;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) store.lcp = entry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as PerformanceEntry[] &
            {
              value: number;
              hadRecentInput: boolean;
            }[]) {
            if (!entry.hadRecentInput) store.cls += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      });

      await page.goto(path, { waitUntil: "networkidle" });
      // Fait défiler la page pour révéler les sections (CLS des apparitions).
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      });

      const metrics = await page.evaluate(() => {
        const vitals = (
          window as unknown as { __vitals: { lcp: number; cls: number } }
        ).__vitals;
        const resources = performance.getEntriesByType(
          "resource",
        ) as PerformanceResourceTiming[];
        const scripts = resources.filter((r) => r.initiatorType === "script");
        const navigation = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        return {
          lcpMs: Math.round(vitals.lcp),
          cls: Number(vitals.cls.toFixed(3)),
          ttfbMs: Math.round(navigation.responseStart),
          scripts: scripts.length,
          jsKiB: Math.round(
            scripts.reduce((sum, r) => sum + r.encodedBodySize, 0) / 1024,
          ),
          htmlKiB: Math.round(navigation.encodedBodySize / 1024),
        };
      });
      console.log(`[perf] ${path} ${JSON.stringify(metrics)}`);
      await testInfo.attach("metrics", {
        body: JSON.stringify(metrics, null, 2),
        contentType: "application/json",
      });

      expect(metrics.cls).toBeLessThan(0.1);
      expect(metrics.lcpMs).toBeLessThan(2500);
    });
  }
});
