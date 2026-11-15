import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";

import {
  APP_PAGE_ROUTES,
  isAppPagePath,
  isMissingPagePath,
} from "../../src/lib/app-routes";
import MissingPage from "../../src/app/(app)/[...missing]/page";
import NotFound from "../../src/app/(app)/not-found";
import { config } from "../../src/middleware";

const appDir = path.join(process.cwd(), "src/app");

function pageRoutes(dir: string, segments: string[]): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === "api") continue;
      const group = /^\(.+\)$/.test(entry.name);
      routes.push(
        ...pageRoutes(
          path.join(dir, entry.name),
          group ? segments : [...segments, entry.name],
        ),
      );
    } else if (entry.name === "page.tsx") {
      routes.push(`/${segments.join("/")}`);
    }
  }
  return routes;
}

// The route list is the page files, minus the catch-all that draws the not-found page.
const fromFiles = pageRoutes(appDir, []).filter((route) => !route.includes("[..."));
assert.deepEqual([...APP_PAGE_ROUTES].sort(), fromFiles.sort());

assert.equal(isAppPagePath("/"), true);
assert.equal(isAppPagePath("/jobs"), true);
assert.equal(isAppPagePath("/jobs/"), true);
assert.equal(isAppPagePath("/jobs?status=active#top"), true);
assert.equal(isAppPagePath("/generate/7eaaa5c7-14ca-4089-ad0d-aade9d337006"), true);
assert.equal(isAppPagePath("/ugc-clone/abc"), true);
assert.equal(isAppPagePath("/privacy"), true);
assert.equal(isAppPagePath("/generate/a/b"), false);
assert.equal(isAppPagePath("/jobs/nope"), false);
assert.equal(isAppPagePath("/JOBS"), false);

assert.equal(isMissingPagePath("/nope"), true);
assert.equal(isMissingPagePath("/gallery/nope"), true);
assert.equal(isMissingPagePath("/privacy/nope"), true);
assert.equal(isMissingPagePath("/NOPE%20space"), true);
assert.equal(isMissingPagePath("/%E0%A4%A"), true);
assert.equal(isMissingPagePath("/jobs"), false);
assert.equal(isMissingPagePath("/%6Aobs"), false);
// API routes, framework assets and file names keep the response they had.
assert.equal(isMissingPagePath("/api/nope"), false);
assert.equal(isMissingPagePath("/api"), false);
assert.equal(isMissingPagePath("/_next/static/nope"), false);
assert.equal(isMissingPagePath("/nope.png"), false);
assert.equal(isMissingPagePath("/fonts/nope.woff2"), false);
assert.equal(isMissingPagePath("/a%2Eb"), false);

// The catch-all renders the not-found page only where the middleware has set the 404 status, so
// every path it treats as a missing page has to be one the middleware runs on.
const matchers = config.matcher.map((source) => new RegExp(`^${source.replace("/:path*", "(?:/.*)?")}$`));
for (const sample of [
  "/nope",
  "/gallery/nope",
  "/a/b/c",
  "/_next/nope",
  "/_nextish",
  "/favicon",
  "/apix",
  "/nope.png",
  "/a.b/c",
  "/_next/static/x",
  "/_next/image",
  "/favicon.ico",
  "/api/nope",
]) {
  if (isMissingPagePath(sample)) {
    assert.ok(
      matchers.some((matcher) => matcher.test(sample)),
      `${sample} is drawn as a missing page but the middleware does not run on it`,
    );
  }
}

async function main() {
  // The catch-all draws a missing page instead of throwing: a thrown notFound() is answered with
  // an empty document that needs JavaScript. A path the middleware does not see still throws.
  const drawn = await MissingPage({ params: Promise.resolve({ missing: ["gallery", "nope"] }) });
  assert.equal(drawn.type, NotFound);
  await assert.rejects(
    MissingPage({ params: Promise.resolve({ missing: ["api", "nope"] }) }),
    (error: unknown) => String((error as { digest?: string }).digest).includes("404"),
  );
  await assert.rejects(
    MissingPage({ params: Promise.resolve({ missing: ["nope.png"] }) }),
  );
  console.log("app routes tests passed");
}

void main();
