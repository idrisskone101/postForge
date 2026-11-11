import assert from "node:assert/strict";
import { isCharacterRecord } from "../../src/lib/characters";
import { isPromptTemplateRecord } from "../../src/lib/prompt-templates";
import { isLocalMediaUrl } from "../../src/lib/demo/slide-media";
import { buildDemoSeed, loadDemoManifest } from "../../src/lib/demo/seed";
import { WORKSPACE_FEATURES } from "../../src/lib/workspace-feature-store";
import { OUTPUT_REVIEW_STATUSES } from "../../src/lib/output-review-status";
import { isAutomationRecord } from "../../src/lib/automations";
import { isCollectionAssetRecord, isCollectionRecord } from "../../src/lib/collections";
import { getModel } from "../../src/lib/ai/models";

async function runSeedTests() {
  // loadDemoManifest also checks every listed file exists and is not empty.
  const manifest = await loadDemoManifest();
  const now = new Date("2026-11-11T15:00:00.000Z");
  const seed = buildDemoSeed(manifest, now);

  // Every tab has something to show.
  assert.ok(seed.jobs.length >= 40);
  assert.ok(seed.files.filter((file) => file.type === "video").length >= 4);
  assert.equal(seed.avatars.length, 4);
  assert.equal(seed.identityPacks.length, 4);
  assert.equal(seed.projects.length, 3);
  assert.equal(seed.slides.length, 15);
  assert.equal(seed.slideshowAutomations.length, 2);
  assert.equal(seed.sources.length, 1);
  assert.equal(seed.references.length, 1);

  // Ids are unique, and stable across restores so open links keep working.
  const ids = [
    ...seed.jobs,
    ...seed.files,
    ...seed.costLogs,
    ...seed.avatars,
    ...seed.identityPacks,
    ...seed.identityImages,
    ...seed.sources,
    ...seed.references,
    ...seed.projects,
    ...seed.slides,
    ...seed.slideshowAutomations,
  ].map((row) => row.id);
  assert.equal(new Set(ids).size, ids.length);
  const later = buildDemoSeed(manifest, new Date("2026-12-01T09:00:00.000Z"));
  assert.deepEqual(
    later.files.map((file) => file.id),
    seed.files.map((file) => file.id)
  );
  assert.notEqual(String(later.files[0].createdAt), String(seed.files[0].createdAt));

  // Every stored path is a real sample file, so nothing renders as missing.
  const paths = [
    ...seed.files.map((file) => file.localPath),
    ...seed.avatars.map((avatar) => avatar.localPath),
    ...seed.identityImages.map((image) => image.localPath),
    ...seed.references.map((reference) => reference.localPath),
    ...seed.sources.flatMap((source) => [source.localPath, source.thumbnailPath]),
  ];
  for (const localPath of paths) {
    assert.ok(typeof localPath === "string" && manifest.find(localPath), String(localPath));
  }

  // Jobs use registry models and known review states; history is in the past.
  const jobIds = new Set(seed.jobs.map((job) => job.id));
  for (const job of seed.jobs) {
    assert.ok(getModel(job.model), job.model);
    assert.ok((job.createdAt as Date).getTime() <= now.getTime());
  }
  const reviewStatuses: string[] = OUTPUT_REVIEW_STATUSES.map((status) => status.value);
  for (const file of seed.files) {
    assert.ok(jobIds.has(file.jobId));
    assert.ok(reviewStatuses.includes(file.reviewStatus as string));
  }
  for (const log of seed.costLogs) {
    assert.ok(jobIds.has(log.jobId));
    assert.ok(log.amount > 0);
  }

  // Unfinished sample jobs can never be picked up and run against a provider.
  const unfinished = seed.jobs.filter(
    (job) => job.status === "queued" || job.status === "processing"
  );
  assert.equal(unfinished.length, 2);
  for (const job of unfinished) {
    assert.equal(job.falRequestId ?? null, null);
    assert.ok(!(job.tags as string[]).includes("ugc-clone"));
  }

  // Slides only point at media that lives in the workspace.
  const fileIds = new Set(seed.files.map((file) => file.id));
  for (const slide of seed.slides) {
    assert.ok(isLocalMediaUrl(slide.imageUrl));
    assert.ok(fileIds.has(slide.generatedFileId as string));
  }

  // Workspace JSON matches what the app itself accepts.
  for (const feature of Object.keys(seed.features)) {
    assert.ok((WORKSPACE_FEATURES as readonly string[]).includes(feature), feature);
  }
  const characters = seed.features.characters ?? [];
  assert.equal(characters.length, 4);
  assert.ok(characters.every(isCharacterRecord));
  assert.ok((seed.features["prompt-templates"] ?? []).every(isPromptTemplateRecord));

  // No Connection is ever seeded: automations are review-draft loops only.
  const automations = (seed.features.automations ?? []) as Array<Record<string, unknown>>;
  assert.equal(automations.length, 3);
  assert.ok(automations.every(isAutomationRecord));
  for (const automation of automations) {
    assert.equal(automation.destination, "manual");
    assert.equal(automation.accountId, null);
    assert.equal(automation.executionEnabled, false);
    assert.equal(automation.publication, undefined);
  }
  const connectionIds = (seed.features.connections ?? []).map((record) => record.id);
  assert.deepEqual(connectionIds, ["workspace-settings", "performance-dataset"]);

  // Collections reference their own asset records.
  const collections = (seed.features.collections ?? []) as Array<Record<string, unknown>>;
  assert.ok(
    collections.every((record) => isCollectionRecord(record) || isCollectionAssetRecord(record))
  );
  const assetIds = new Set(
    collections.filter((record) => record.kind === "asset").map((record) => record.id)
  );
  for (const collection of collections.filter((record) => record.kind === "collection")) {
    const members = collection.assetIds as string[];
    assert.equal(members.length, 6);
    assert.ok(members.every((id) => assetIds.has(id)));
  }
}

runSeedTests()
  .then(() => console.log("demo seed tests passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
