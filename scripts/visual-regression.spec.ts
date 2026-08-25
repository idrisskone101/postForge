import { expect, test } from "playwright/test";
import {
  CRITICAL_OVERFLOW_SELECTORS,
  VISUAL_REGRESSION_ROUTES,
  VISUAL_VIEWPORTS,
} from "./visual-regression-routes";

const proofDir = process.env.VISUAL_PROOF_DIR ?? `/tmp/postforge-visual-${process.pid}`;

test.describe("workspace visual regression", () => {
  for (const viewport of VISUAL_VIEWPORTS) {
    for (const route of VISUAL_REGRESSION_ROUTES) {
      test(`${viewport.name} ${route}`, async ({ page }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        expect
          .soft(
            await page.evaluate(collectOverflow, [...CRITICAL_OVERFLOW_SELECTORS]),
            `${route} first-paint`
          )
          .toEqual([]);
        await page.screenshot({
          path: `${proofDir}/${viewport.name}${route.replaceAll("/", "_") || "_home"}-first-paint.png`,
        });

        await page.waitForLoadState("load");
        expect
          .soft(
            await page.evaluate(collectOverflow, [...CRITICAL_OVERFLOW_SELECTORS]),
            `${route} load`
          )
          .toEqual([]);

        const island = page.locator("[data-header-accessory], button, a").first();
        if (await island.count()) {
          await island.click({ trial: true }).catch(() => undefined);
        }
        expect
          .soft(
            await page.evaluate(collectOverflow, [...CRITICAL_OVERFLOW_SELECTORS]),
            `${route} first-input`
          )
          .toEqual([]);
        await page.screenshot({
          path: `${proofDir}/${viewport.name}${route.replaceAll("/", "_") || "_home"}-load.png`,
        });
      });
    }
  }
});

function collectOverflow(selectors: string[]) {
  const hits: { selector: string; scrollWidth: number; clientWidth: number }[] =
    [];
  const root = document.documentElement;
  if (root.scrollWidth > window.innerWidth + 1) {
    hits.push({
      selector: "html",
      scrollWidth: root.scrollWidth,
      clientWidth: window.innerWidth,
    });
  }
  for (const selector of selectors) {
    for (const node of document.querySelectorAll(selector)) {
      if (!(node instanceof HTMLElement)) {
        continue;
      }
      if (node.scrollWidth > node.clientWidth + 1) {
        hits.push({
          selector,
          scrollWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
        });
      }
    }
  }
  return hits;
}
