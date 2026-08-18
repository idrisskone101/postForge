import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  clampPreviewZoom,
  PREVIEW_ZOOM_MAX,
  PREVIEW_ZOOM_MIN,
  PREVIEW_ZOOM_STEP,
  selectAutomationPreviewAsset,
} from "../../src/app/automations/new/automation-builder-client";

assert.equal(clampPreviewZoom(PREVIEW_ZOOM_MIN - 100), PREVIEW_ZOOM_MIN);
assert.equal(clampPreviewZoom(PREVIEW_ZOOM_MAX + 100), PREVIEW_ZOOM_MAX);
assert.equal(clampPreviewZoom(58), 58);

let zoom = 58;
for (let index = 0; index < 20; index += 1) {
  zoom = clampPreviewZoom(zoom - PREVIEW_ZOOM_STEP);
}
assert.equal(zoom, PREVIEW_ZOOM_MIN, "zoom-out must clamp at the visible minimum");

for (let index = 0; index < 20; index += 1) {
  zoom = clampPreviewZoom(zoom + PREVIEW_ZOOM_STEP);
}
assert.equal(zoom, PREVIEW_ZOOM_MAX, "zoom-in must clamp at the visible maximum");

const generatedPreview = selectAutomationPreviewAsset({
  sourceFileId: "generated-1",
  sourceFile: {
    id: "generated-1",
    filename: "campaign-shot.mp4",
    type: "video",
    mimeType: "video/mp4",
    previewUrl: "/api/files/generated-1",
  },
  collectionId: "collection-1",
  collections: [
    {
      id: "collection-1",
      kind: "collection",
      name: "Launch imagery",
      assetIds: ["collection-asset-1"],
      createdAt: "2026-08-03T00:00:00.000Z",
      updatedAt: "2026-08-03T00:00:00.000Z",
    },
  ],
  collectionAssets: [
    {
      id: "collection-asset-1",
      kind: "asset",
      name: "Bottle portrait",
      filename: "bottle.jpg",
      mimeType: "image/jpeg",
      fileSizeBytes: 2048,
      localPath: "collection-assets/bottle.jpg",
      createdAt: "2026-08-03T00:00:00.000Z",
    },
  ],
});
assert.deepEqual(generatedPreview, {
  id: "generated-1",
  name: "campaign-shot.mp4",
  kind: "video",
  previewUrl: "/api/files/generated-1",
  origin: "Attached generated asset",
});

const collectionPreview = selectAutomationPreviewAsset({
  sourceFileId: null,
  sourceFile: null,
  collectionId: "collection-1",
  collections: [
    {
      id: "collection-1",
      kind: "collection",
      name: "Launch imagery",
      assetIds: ["collection asset/1"],
      createdAt: "2026-08-03T00:00:00.000Z",
      updatedAt: "2026-08-03T00:00:00.000Z",
    },
  ],
  collectionAssets: [
    {
      id: "collection asset/1",
      kind: "asset",
      name: "Bottle portrait",
      filename: "bottle.jpg",
      mimeType: "image/jpeg",
      fileSizeBytes: 2048,
      localPath: "collection-assets/bottle.jpg",
      createdAt: "2026-08-03T00:00:00.000Z",
    },
  ],
});
assert.equal(collectionPreview?.previewUrl, "/api/files/collection%20asset%2F1");
assert.equal(collectionPreview?.origin, "Visual collection");

const source = readFileSync(
  new URL("../../src/app/automations/new/automation-builder-client.tsx", import.meta.url),
  "utf8"
);

for (const requiredControl of [
  "Favorites",
  "Recommended",
  "Name",
  "Slides",
  "Grid view",
  "List view",
  "Build from scratch",
  "Preview",
  "Select",
  "Selected playbook",
  "Apply playbook",
  "Zoom preview out",
  "Zoom preview in",
  "Unsaved changes",
  "Draft saved",
  "Save failed — try again",
  "Connected social account",
  "Upload capability",
  "Save for connection",
  "Save reviewed plan",
  "Attached generated asset",
  "Visual collection",
]) {
  assert.ok(
    source.includes(requiredControl),
    `automation builder should keep the ${requiredControl} control or state`
  );
}

assert.match(source, /saveWorkspaceFeature\("automations", next\)/);
assert.match(source, /fetchIntegrations/);
assert.match(source, /AUTOMATION_SOCIAL_DESTINATIONS/);
assert.match(source, /resolveAutomationDestination/);
assert.match(source, /SocialProviderIcon/);
assert.match(source, /Approval required before any provider handoff/);
assert.match(source, /composeAutomationHook\(record\.hook\.strategy, record\.hook\.prompt\)/);
assert.match(source, /Composed locally from your prompt and strategy\. No network request\./);
assert.match(source, /AutomationPreviewMedia asset=\{previewAsset\}/);
assert.doesNotMatch(source, /Math\.floor\(Math\.random\(\) \* 3\)/);

const hubSource = readFileSync(
  new URL("../../src/app/automations/automations-page-client.tsx", import.meta.url),
  "utf8"
);

for (const requiredHubState of [
  "SocialProviderIcon",
  "Live social connection status is unavailable",
  "Provider not configured",
  "Upload scope missing",
  "Account disconnected",
  "Reconnect required",
  "Connection verified",
  "Generate review draft",
  "Activate local schedule",
  "Pause local schedule",
  "Social plans never auto-publish",
  "explicit confirmation",
]) {
  assert.ok(
    hubSource.includes(requiredHubState),
    `automation hub should keep the ${requiredHubState} state`
  );
}

assert.match(hubSource, /fetchIntegrations\(\)/);
assert.match(hubSource, /resolveAutomationDestination/);
assert.match(hubSource, /\/api\/automations\/\$\{encodeURIComponent\(record\.id\)\}\/run/);
assert.match(hubSource, /router\.push\(`\/generate\/\$\{encodeURIComponent\(body\.id\)\}`\)/);
assert.match(hubSource, /grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7/);
assert.match(hubSource, /executionEnabled: false/);
assert.match(hubSource, /createAutomationSchedulerState\(\)/);
assert.match(hubSource, /\[overflow-wrap:anywhere\]/);

const runRouteSource = readFileSync(
  new URL(
    "../../src/app/api/automations/[id]/run/route.ts",
    import.meta.url
  ),
  "utf8"
);
assert.match(runRouteSource, /isSameOriginMutation\(request\)/);
assert.match(runRouteSource, /readWorkspaceFeatureRecords<AutomationRecord>/);
assert.match(runRouteSource, /generateImage\(generationRequest, undefined, options\)/);
assert.match(runRouteSource, /lastRunAt: acceptedAt/);
assert.match(runRouteSource, /publishingStarted: false/);

const scheduleRouteSource = readFileSync(
  new URL(
    "../../src/app/api/automations/[id]/schedule/route.ts",
    import.meta.url
  ),
  "utf8"
);
assert.match(scheduleRouteSource, /isSameOriginMutation\(request\)/);
assert.match(scheduleRouteSource, /updateWorkspaceFeatureRecords<AutomationRecord>/);
assert.match(scheduleRouteSource, /candidate\.destination !== "manual"/);
assert.match(scheduleRouteSource, /executionEnabled: action === "activate"/);
assert.match(scheduleRouteSource, /Automatic social scheduling is unavailable/);

const schedulerSource = readFileSync(
  new URL("../../src/lib/automation-scheduler.ts", import.meta.url),
  "utf8"
);
assert.match(schedulerSource, /getDueAutomationScheduleSlot/);
assert.match(schedulerSource, /updateWorkspaceFeatureRecords<AutomationRecord>/);
assert.match(schedulerSource, /generateImage\(spec\.request/);
assert.match(schedulerSource, /scheduleSlot:/);

const bootstrapSource = readFileSync(
  new URL("../../src/lib/runtime-bootstrap.ts", import.meta.url),
  "utf8"
);
assert.match(bootstrapSource, /ensureAutomationSchedulerRunning/);

const workspaceFeatureRouteSource = readFileSync(
  new URL(
    "../../src/app/api/workspace-features/[feature]/route.ts",
    import.meta.url
  ),
  "utf8"
);
assert.match(
  workspaceFeatureRouteSource,
  /requested\.status === "active" \|\| requested\.executionEnabled === true/
);
assert.equal(
  workspaceFeatureRouteSource.match(/isSameOriginMutation\(request\)/g)?.length,
  2,
  "generic workspace PUT and DELETE mutations should reject cross-origin requests"
);
assert.match(workspaceFeatureRouteSource, /executionEnabled: false/);
assert.match(workspaceFeatureRouteSource, /existing\?\.scheduler/);
assert.equal(
  workspaceFeatureRouteSource.match(
    /publicationIsUnresolved\(existing\?\.publication\)/g
  )?.length,
  2,
  "automation PUT identity changes and DELETE share the retention-aware publication lock"
);

assert.match(hubSource, /publicationIsUnresolved\(record\.publication\)/);
assert.doesNotMatch(
  hubSource,
  /function publicationIsUnresolved/,
  "the delete control must use the shared retention-aware lifecycle helper"
);

assert.match(source, /executionEnabled: false/);
assert.match(source, /pf-safe-overlay/);
assert.match(source, /max-h-full/);
assert.match(source, /overflow-y-auto/);
assert.match(source, /\[overflow-wrap:anywhere\]/);

console.log("automation builder parity tests passed");
