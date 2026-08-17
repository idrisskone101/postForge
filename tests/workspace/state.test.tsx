import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { Compass, RefreshCw } from "lucide-react";
import {
  WorkspaceState,
  WorkspaceStateSkeleton,
} from "../../src/components/workspace-state";

const workspaceStateSource = readFileSync(
  new URL("../../src/components/workspace-state.tsx", import.meta.url),
  "utf8"
);

// Home renders this shared empty state from a Server Component. Keeping this
// module server-compatible prevents icon components from crossing the RSC
// serialization boundary; client importers still include it in their client graph.
assert.doesNotMatch(workspaceStateSource, /^\s*["']use client["'];/);

const emptyMarkup = renderToStaticMarkup(
  <WorkspaceState
    tone="empty"
    icon={Compass}
    title="Start Source Selection"
    description="Track a creator to build the first cached source feed."
    action={{ href: "/ugc-inspiration", label: "Track Creator" }}
    secondaryAction={{ href: "/ugc-clone", label: "Start Clone" }}
  />
);

assert.match(emptyMarkup, /data-workspace-state="empty"/);
assert.match(emptyMarkup, /Start Source Selection/);
assert.match(emptyMarkup, /Track a creator/);
assert.match(emptyMarkup, /href="\/ugc-inspiration"/);
assert.match(emptyMarkup, /Track Creator/);
assert.match(emptyMarkup, /href="\/ugc-clone"/);
assert.match(emptyMarkup, /Start Clone/);
assert.match(emptyMarkup, /border-dashed/);
assert.match(emptyMarkup, /bg-accent-blue\/12/);

const errorMarkup = renderToStaticMarkup(
  <WorkspaceState
    tone="error"
    icon={RefreshCw}
    title="Gallery failed to load"
    description="The output review list could not be refreshed."
    action={{ label: "Retry Gallery", onClick: () => {} }}
  />
);

assert.match(errorMarkup, /data-workspace-state="error"/);
assert.match(errorMarkup, /Gallery failed to load/);
assert.match(errorMarkup, /Retry Gallery/);
assert.match(errorMarkup, /type="button"/);
assert.match(errorMarkup, /text-destructive/);

const loadingMarkup = renderToStaticMarkup(
  <WorkspaceStateSkeleton
    title="Loading Gallery"
    lines={3}
    actions={2}
    preserveHeightClassName="min-h-80"
  />
);

assert.match(loadingMarkup, /data-workspace-state="loading"/);
assert.match(loadingMarkup, /Loading Gallery/);
assert.match(loadingMarkup, /min-h-80/);
assert.equal((loadingMarkup.match(/data-state-skeleton-line/g) ?? []).length, 3);
assert.equal((loadingMarkup.match(/data-state-skeleton-action/g) ?? []).length, 2);
