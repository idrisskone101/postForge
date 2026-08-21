import assert from "node:assert/strict";
import {
  applyPlaybookToRecord,
  preparePlanSave,
} from "../../src/app/automations/new/automation-builder-plan";
import { createAutomationRecord } from "../../src/lib/automations";

const draft = createAutomationRecord("story-lesson");
draft.name = "   ";
const unnamed = preparePlanSave({
  record: draft,
  mode: "draft",
  integrationStatuses: [],
});
assert.equal(unnamed.ok, false);
if (!unnamed.ok) {
  assert.equal(unnamed.error, "Give this automation a name before saving.");
}

const noDays = createAutomationRecord("story-lesson");
noDays.schedule.days = [];
const missingDays = preparePlanSave({
  record: noDays,
  mode: "draft",
  integrationStatuses: [],
});
assert.equal(missingDays.ok, false);
if (!missingDays.ok) {
  assert.equal(missingDays.error, "Choose at least one schedule day.");
}

const social = createAutomationRecord("story-lesson");
social.destination = "tiktok";
social.approvalRequired = false;
const blocked = preparePlanSave({
  record: social,
  mode: "create",
  integrationStatuses: [],
});
assert.equal(blocked.ok, false);
if (!blocked.ok) {
  assert.equal(
    blocked.error,
    "Social automations require approval before any publishing step."
  );
}

const ready = createAutomationRecord("before-after", { sourceFileId: "file-1" });
ready.name = "Launch loop";
const saved = preparePlanSave({
  record: ready,
  mode: "draft",
  integrationStatuses: [],
});
assert.equal(saved.ok, true);
if (saved.ok) {
  assert.equal(saved.record.executionEnabled, false);
  assert.equal(saved.record.status, "draft");
  assert.equal(saved.record.name, "Launch loop");
  assert.equal(saved.record.content.sourceFileId, "file-1");
}

const current = createAutomationRecord("story-lesson", { sourceFileId: "keep-me" });
current.content.collectionId = "collection-1";
current.destination = "manual";
const applied = applyPlaybookToRecord(current, "custom");
assert.equal(applied.template, "custom");
assert.equal(applied.id, current.id);
assert.equal(applied.createdAt, current.createdAt);
assert.equal(applied.content.sourceFileId, "keep-me");
assert.equal(applied.content.collectionId, "collection-1");
assert.equal(applied.destination, "manual");

console.log("automation builder plan tests passed");
