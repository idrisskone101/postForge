import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";

import { NextRequest } from "next/server";

import {
  APP_PAGE_ROUTES,
  MISSING_PAGE_PATH,
  STATIC_FILE_ROOTS,
  isAppPagePath,
  isMissingPagePath,
  isStaticFilePath,
} from "../../src/lib/app-routes";
import MissingPage from "../../src/app/(app)/[...missing]/page";
import NotFound from "../../src/app/(app)/not-found";
import { config, middleware } from "../../src/middleware";

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
// A file name under no route is a missing page like any other.
assert.equal(isMissingPagePath("/nope.html"), true);
assert.equal(isMissingPagePath("/nope.png"), true);
assert.equal(isMissingPagePath("/.well-known/nope"), true);
assert.equal(isMissingPagePath("/a%2Eb"), true);
assert.equal(isMissingPagePath("/generate/a%2Fb"), true);
// API routes, framework paths and static files keep the response they had.
assert.equal(isMissingPagePath("/api/nope"), false);
assert.equal(isMissingPagePath("/api"), false);
assert.equal(isMissingPagePath("/_next/static/nope"), false);
assert.equal(isMissingPagePath("/__nextjs_font/geist-latin.woff2"), false);
assert.equal(isMissingPagePath("/favicon.ico"), false);
assert.equal(isMissingPagePath("/file.svg"), false);
assert.equal(isMissingPagePath("/fonts/nope.woff2"), false);
assert.equal(isMissingPagePath("/fontsy.woff2"), true);

// The static roots are the top level of public/ plus the icon the app directory serves.
const staticRoots = [
  ...readdirSync(path.join(process.cwd(), "public")).filter((name) => !name.startsWith(".")),
  ...readdirSync(appDir).filter((name) => name.endsWith(".ico")),
].map((name) => `/${name}`);
assert.deepEqual([...STATIC_FILE_ROOTS].sort(), staticRoots.sort());
assert.equal(isStaticFilePath("/fonts/figtree-latin-wght-normal.woff2"), true);
assert.equal(isStaticFilePath("/fonts"), true);
assert.equal(isStaticFilePath("/nope.html"), false);

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
  "/nope.html",
  "/.well-known/nope",
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

function answer(pathname: string) {
  const response = middleware(new NextRequest(`http://localhost${pathname}`));
  return {
    status: response.status,
    rewrite: response.headers.get("x-middleware-rewrite"),
    pathname: response.headers.get("x-middleware-request-x-pathname"),
  };
}

// A missing page gets the 404 status and is left for the catch-all to draw.
assert.deepEqual(answer("/nope.html"), { status: 404, rewrite: null, pathname: "/nope.html" });
assert.deepEqual(answer("/.well-known/nope"), {
  status: 404,
  rewrite: null,
  pathname: "/.well-known/nope",
});
// Next would route an escaped slash to the detail page and reject a malformed escape, so those
// are sent to the catch-all by a rewrite. The layout still reads the address that was asked for.
assert.deepEqual(answer("/generate/a%2Fb"), {
  status: 404,
  rewrite: `http://localhost${MISSING_PAGE_PATH}`,
  pathname: "/generate/a%2Fb",
});
assert.deepEqual(answer("/%E0%A4%A"), {
  status: 404,
  rewrite: `http://localhost${MISSING_PAGE_PATH}`,
  pathname: "/%E0%A4%A",
});
assert.equal(isMissingPagePath(MISSING_PAGE_PATH), true);
// A page keeps its status, and a static file passes through with nothing added.
assert.deepEqual(answer("/jobs"), { status: 200, rewrite: null, pathname: "/jobs" });
assert.deepEqual(answer("/file.svg"), { status: 200, rewrite: null, pathname: null });
assert.deepEqual(answer("/fonts/figtree-latin-wght-normal.woff2"), {
  status: 200,
  rewrite: null,
  pathname: null,
});

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
    MissingPage({ params: Promise.resolve({ missing: ["fonts", "nope.woff2"] }) }),
  );
  const dotted = await MissingPage({ params: Promise.resolve({ missing: ["nope.html"] }) });
  assert.equal(dotted.type, NotFound);
  console.log("app routes tests passed");
}

void main();
