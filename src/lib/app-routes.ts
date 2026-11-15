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
 * A URL that is no page of the app and that the middleware sees: not an API route, not a framework
 * asset, not a file name. The middleware answers these with a 404 status and the catch-all route
 * renders the not-found page for them on the server, so both must ask this one question.
 */
export function isMissingPagePath(pathname: string) {
  const path = cleanPath(pathname);
  if (path.includes(".")) return false;
  if (path === "/api" || path.startsWith("/api/")) return false;
  if (path.startsWith("/_next/")) return false;
  return !isAppPagePath(path);
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
