/**
 * Request policy for the demo workspace. Pure and Edge-safe: the middleware
 * calls it for every request when the build is a demo build.
 *
 * Visitors may browse everything and edit the sample content. Anything that
 * spends provider credits, reaches an external service, or accepts a file is
 * refused. Mutations are an allowlist, so a route added later is closed here
 * until someone decides it is safe.
 */
export type DemoRequest = {
  method: string;
  pathname: string;
  contentType?: string | null;
  contentLength?: string | null;
  transferEncoding?: string | null;
};

export type DemoRequestDecision =
  | { action: "allow" }
  | { action: "redirect"; to: string }
  | { action: "not-found" }
  | { action: "block" };

/** JSON edits in the app are small; anything larger is an upload in disguise. */
export const DEMO_MAX_BODY_BYTES = 256 * 1024;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const ID = "[^/]+";

/** Local edits to the sample content. Everything else that mutates is closed. */
const ALLOWED_MUTATIONS: ReadonlyArray<readonly [string, RegExp]> = [
  ["PATCH", route(`/api/files/${ID}/review-status`)],
  ["DELETE", route(`/api/files/${ID}`)],
  ["DELETE", route(`/api/jobs/${ID}`)],
  ["DELETE", route(`/api/avatars/${ID}`)],
  ["POST", route("/api/avatars/from-generation")],
  ["DELETE", route(`/api/collection-assets/${ID}`)],
  ["DELETE", route(`/api/ugc-clone/sources/${ID}`)],
  ["POST", route("/api/slideshows")],
  ["PATCH", route(`/api/slideshows/${ID}`)],
  ["DELETE", route(`/api/slideshows/${ID}`)],
  ["POST", route(`/api/slideshows/${ID}/duplicate`)],
  ["POST", route(`/api/slideshows/${ID}/reorder`)],
  ["POST", route(`/api/slideshows/${ID}/export`)],
  ["POST", route(`/api/slideshows/${ID}/slides`)],
  ["PATCH", route(`/api/slideshows/${ID}/slides/${ID}`)],
  ["DELETE", route(`/api/slideshows/${ID}/slides/${ID}`)],
  ["POST", route("/api/slideshows/overlay")],
  ["POST", route("/api/slideshows/automations")],
  ["PATCH", route(`/api/slideshows/automations/${ID}`)],
  ["DELETE", route(`/api/slideshows/automations/${ID}`)],
  ["POST", route(`/api/automations/${ID}/schedule`)],
  ["PUT", route(`/api/workspace-features/${ID}`)],
  ["DELETE", route(`/api/workspace-features/${ID}`)],
  ["PUT", route("/api/settings/models")],
];

/** Read routes that start an external flow or exist only for provider crawlers and cron. */
const CLOSED_READS: readonly RegExp[] = [
  route(`/api/integrations/${ID}/connect`),
  route(`/api/integrations/${ID}/callback`),
  route("/api/integrations/retention"),
  route("/api/integrations/instagram/deauthorize"),
  /^\/api\/integrations\/publish-media(\/|$)/,
  /^\/api\/internal(\/|$)/,
];

export function evaluateDemoRequest(request: DemoRequest): DemoRequestDecision {
  const pathname = stripTrailingSlash(request.pathname);
  const method = request.method.toUpperCase();

  // Inspiration shows other creators' posts, so the demo does not carry it.
  if (pathname === "/ugc-inspiration" || pathname.startsWith("/ugc-inspiration/")) {
    return { action: "redirect", to: "/" };
  }
  if (pathname === "/api/ugc-inspiration" || pathname.startsWith("/api/ugc-inspiration/")) {
    return { action: "not-found" };
  }

  if (!pathname.startsWith("/api/")) return { action: "allow" };

  if (CLOSED_READS.some((pattern) => pattern.test(pathname))) {
    return { action: "block" };
  }
  if (SAFE_METHODS.has(method)) return { action: "allow" };

  const allowed = ALLOWED_MUTATIONS.some(
    ([allowedMethod, pattern]) => allowedMethod === method && pattern.test(pathname)
  );
  if (!allowed || carriesUpload(request)) return { action: "block" };
  return { action: "allow" };
}

function carriesUpload(request: DemoRequest): boolean {
  const contentType = (request.contentType ?? "").toLowerCase();
  if (contentType.startsWith("multipart/")) return true;
  if ((request.transferEncoding ?? "").toLowerCase().includes("chunked")) return true;

  const rawLength = request.contentLength;
  if (rawLength === null || rawLength === undefined || rawLength === "") return false;
  const length = Number(rawLength);
  return !Number.isFinite(length) || length < 0 || length > DEMO_MAX_BODY_BYTES;
}

function route(pattern: string): RegExp {
  return new RegExp(`^${pattern}$`);
}

function stripTrailingSlash(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}
