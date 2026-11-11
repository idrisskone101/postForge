import assert from "node:assert/strict";
import {
  DEMO_MAX_BODY_BYTES,
  evaluateDemoRequest,
  type DemoRequest,
} from "../../src/lib/demo/request-policy";
import {
  DEMO_SIZE_LIMITS,
  isOversizedDemoWorkspace,
  isSafeDemoDatabase,
} from "../../src/lib/demo/database-guard";
import { createDemoRateLimiter } from "../../src/lib/demo/rate-limit";

function decide(method: string, pathname: string, extra: Partial<DemoRequest> = {}) {
  return evaluateDemoRequest({ method, pathname, ...extra }).action;
}

// Pages are open; Inspiration is not part of the demo at all.
assert.equal(decide("GET", "/"), "allow");
assert.equal(decide("GET", "/gallery"), "allow");
assert.equal(decide("GET", "/ugc-inspiration"), "redirect");
assert.equal(decide("GET", "/ugc-inspiration/anything"), "redirect");
assert.equal(decide("GET", "/api/ugc-inspiration/accounts"), "not-found");
assert.equal(decide("POST", "/api/ugc-inspiration/accounts"), "not-found");

// Reads are open, except the ones that start an external flow.
assert.equal(decide("GET", "/api/gallery"), "allow");
assert.equal(decide("GET", "/api/files/abc/download"), "allow");
assert.equal(decide("GET", "/api/integrations"), "allow");
assert.equal(decide("GET", "/api/integrations/tiktok/connect"), "block");
assert.equal(decide("GET", "/api/integrations/youtube/callback"), "block");
assert.equal(decide("GET", "/api/integrations/retention"), "block");
assert.equal(decide("GET", "/api/integrations/publish-media/abc"), "block");
assert.equal(decide("GET", "/api/internal/slideshow-automations/tick"), "block");

// Local edits to the sample content are allowed.
const allowedEdits: Array<[string, string]> = [
  ["PATCH", "/api/files/abc/review-status"],
  ["DELETE", "/api/files/abc"],
  ["DELETE", "/api/jobs/abc"],
  ["DELETE", "/api/avatars/abc"],
  ["DELETE", "/api/collection-assets/abc"],
  ["POST", "/api/slideshows"],
  ["PATCH", "/api/slideshows/abc"],
  ["POST", "/api/slideshows/abc/duplicate"],
  ["POST", "/api/slideshows/abc/reorder"],
  ["PATCH", "/api/slideshows/abc/slides/def"],
  ["POST", "/api/slideshows/abc/export"],
  ["PATCH", "/api/slideshows/automations/abc"],
  ["POST", "/api/automations/abc/schedule"],
  ["PUT", "/api/workspace-features/characters"],
  ["DELETE", "/api/workspace-features/automations"],
  ["PUT", "/api/settings/models"],
];
for (const [method, pathname] of allowedEdits) {
  assert.equal(decide(method, pathname), "allow", `${method} ${pathname}`);
}
assert.equal(decide("patch", "/api/slideshows/abc/"), "allow");

// Anything that spends credits, reaches a provider, or takes a file is closed.
const closed: Array<[string, string]> = [
  ["POST", "/api/generate/images"],
  ["POST", "/api/generate/videos"],
  ["POST", "/api/generate/swap"],
  ["POST", "/api/generate/phone-composite"],
  ["POST", "/api/prompts/improve"],
  ["POST", "/api/avatars"],
  ["PUT", "/api/avatars/abc"],
  ["POST", "/api/avatars/abc/identity-pack"],
  ["POST", "/api/avatars/import-candidate"],
  // Copies an output's bytes into the database on every call.
  ["POST", "/api/avatars/from-generation"],
  ["POST", "/api/collection-assets"],
  ["POST", "/api/collection-assets/pinterest-import"],
  ["POST", "/api/collection-assets/vibe"],
  ["POST", "/api/swap-assets"],
  ["POST", "/api/ugc-clone/download"],
  ["POST", "/api/ugc-clone/generate"],
  ["POST", "/api/ugc-clone/reference-image"],
  ["POST", "/api/ugc-clone/trim"],
  ["POST", "/api/slideshows/generate-story"],
  ["POST", "/api/slideshows/creator/derive"],
  ["POST", "/api/slideshows/abc/generate-visuals"],
  ["POST", "/api/slideshows/abc/slides/def/generate-image"],
  ["POST", "/api/automations/abc/run"],
  ["POST", "/api/automations/abc/publish"],
  ["POST", "/api/jobs/abc/retry"],
  ["PUT", "/api/settings/provider-credentials"],
  ["DELETE", "/api/settings/provider-credentials"],
  ["POST", "/api/integrations/tiktok/connect"],
  ["POST", "/api/integrations/tiktok/accounts/abc/sync"],
  ["POST", "/api/integrations/instagram/deauthorize"],
  ["POST", "/api/internal/slideshow-automations/tick"],
  // A route nobody has classified yet is closed by default.
  ["POST", "/api/some-future-route"],
];
for (const [method, pathname] of closed) {
  assert.equal(decide(method, pathname), "block", `${method} ${pathname}`);
}

// An allowed route still refuses anything shaped like an upload.
const edit = "/api/workspace-features/characters";
assert.equal(
  decide("PUT", edit, { contentType: "application/json", contentLength: "2048" }),
  "allow"
);
assert.equal(
  decide("PUT", edit, { contentType: "multipart/form-data; boundary=x" }),
  "block"
);
assert.equal(
  decide("PUT", edit, { contentLength: String(DEMO_MAX_BODY_BYTES + 1) }),
  "block"
);
assert.equal(decide("PUT", edit, { contentLength: "not-a-number" }), "block");
assert.equal(decide("PUT", edit, { transferEncoding: "chunked" }), "block");

// The restore wipes the database, so it only runs where that is safe.
assert.equal(isSafeDemoDatabase({ hasMarker: true, contentRows: 500 }), true);
assert.equal(isSafeDemoDatabase({ hasMarker: false, contentRows: 0 }), true);
assert.equal(isSafeDemoDatabase({ hasMarker: false, contentRows: 1 }), false);

assert.equal(
  isOversizedDemoWorkspace({ rows: 200, storedBytes: 40_000 }),
  false
);
assert.equal(
  isOversizedDemoWorkspace({ rows: DEMO_SIZE_LIMITS.rows + 1, storedBytes: 0 }),
  true
);
assert.equal(
  isOversizedDemoWorkspace({ rows: 0, storedBytes: DEMO_SIZE_LIMITS.storedBytes + 1 }),
  true
);

// Edits and heavy renders are metered; plain reads and pages are not.
function metered(method: string, pathname: string) {
  const decision = evaluateDemoRequest({ method, pathname });
  return decision.action === "allow" && decision.metered;
}
assert.equal(metered("PATCH", "/api/slideshows/abc"), true);
assert.equal(metered("GET", "/api/slideshows/abc/export"), true);
assert.equal(metered("GET", "/api/ugc-clone/thumbnails"), true);
assert.equal(metered("GET", "/api/gallery"), false);
assert.equal(metered("GET", "/gallery"), false);

// One visitor cannot use the whole budget, and the budget resets each window.
const limiter = createDemoRateLimiter({ windowMs: 1_000, perClient: 2, overall: 3 });
assert.equal(limiter.take("a", 0), true);
assert.equal(limiter.take("a", 10), true);
assert.equal(limiter.take("a", 20), false);
assert.equal(limiter.take("b", 30), true);
assert.equal(limiter.take("c", 40), false);
assert.equal(limiter.take("a", 1_000), true);
assert.equal(limiter.take("c", 1_010), true);

console.log("demo request policy tests passed");
