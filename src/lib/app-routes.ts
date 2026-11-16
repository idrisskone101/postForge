/**
 * Every page the app serves, as Next route patterns. tests/workspace/app-routes.test.ts keeps this
 * list equal to the page files under src/app, so a new route cannot be forgotten here.
 */
export const APP_PAGE_ROUTES = [
  "/",
  "/automations",
  "/automations/new",
  "/characters",
  "/characters/new",
  "/collections",
  "/costs",
  "/data-deletion",
  "/gallery",
  "/generate",
  "/generate/[id]",
  "/jobs",
  "/performance",
  "/privacy",
  "/settings",
  "/slideshow",
  "/terms",
  "/ugc-clone",
  "/ugc-clone/[id]",
  "/ugc-inspiration",
] as const;

export function isAppPagePath(pathname: string) {
  const path = cleanPath(pathname);
  return ROUTE_MATCHERS.some((matcher) => matcher.test(path));
}

/**
 * The top level of public/ plus the icon file the app directory serves. A file name is that file; a
 * directory name covers everything under it. tests/workspace/app-routes.test.tsx keeps this equal
 * to the files on disk.
 */
export const STATIC_FILE_ROOTS = [
  "/brands",
  "/character-builder",
  "/favicon.ico",
  "/file.svg",
  "/fonts",
  "/globe.svg",
  "/naruto-mascot.png",
  "/next.svg",
  "/vercel.svg",
  "/window.svg",
] as const;

export function isStaticFilePath(pathname: string) {
  const path = cleanPath(pathname);
  return STATIC_FILE_ROOTS.some((root) => path === root || path.startsWith(`${root}/`));
}

/**
 * A URL that is no page of the app: not an API route, not a framework path, not a static file.
 * The middleware answers these with a 404 status and the catch-all route renders the not-found
 * page for them on the server, so both must ask this one question.
 */
export function isMissingPagePath(pathname: string) {
  const path = cleanPath(pathname);
  if (path === "/api" || path.startsWith("/api/")) return false;
  if (path.startsWith("/_next/") || path.startsWith("/__nextjs")) return false;
  if (isStaticFilePath(path)) return false;
  return !isAppPagePath(path);
}

/** The one path the middleware sends a missing page to when Next would route its URL elsewhere. */
export const MISSING_PAGE_PATH = "/_missing";

/**
 * Next decodes a URL one segment at a time, so it routes an escaped slash to a dynamic page and
 * rejects a malformed escape before any page renders. A missing page whose URL holds an escape is
 * therefore rewritten to MISSING_PAGE_PATH; every other one reaches the catch-all by itself.
 */
export function missingPageNeedsRewrite(pathname: string) {
  return pathname.includes("%");
}

function cleanPath(pathname: string) {
  let path = pathname.split(/[?#]/)[0] || "/";
  try {
    path = decodeURIComponent(path);
  } catch {
    // A malformed escape is no route of the app; match it as written.
  }
  return path.length > 1 ? path.replace(/\/+$/, "") || "/" : path;
}

const ROUTE_MATCHERS = APP_PAGE_ROUTES.map(
  (route) =>
    new RegExp(
      `^${route
        .split("/")
        .map((segment) => (/^\[[^.\]]+\]$/.test(segment) ? "[^/]+" : segment))
        .join("/")}$`,
    ),
);
