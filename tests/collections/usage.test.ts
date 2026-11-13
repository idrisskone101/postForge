import assert from "node:assert/strict";
import {
  collectionUsageLabel,
  countCollectionUsage,
} from "@/app/(app)/collections/collection-usage";
import { createAutomationRecord } from "@/lib/automations";

function videoAutomation(collectionId: string | null) {
  const record = createAutomationRecord();
  return { ...record, content: { ...record.content, collectionId } };
}

const usage = countCollectionUsage(
  [
    videoAutomation("collection_a"),
    videoAutomation("collection_a"),
    videoAutomation(null),
    { id: "not-an-automation", kind: "note" },
  ],
  [
    { visualPolicy: "reuse", imageCollectionId: "collection_a" },
    { visualPolicy: "reuse", imageCollectionId: "collection_b" },
    { visualPolicy: "fresh-ai", imageCollectionId: "collection_b" },
    { imageCollectionId: "  " },
    null,
  ]
);

assert.deepEqual(usage, { collection_a: 3, collection_b: 1 });
assert.equal("collection_c" in usage, false, "an unreferenced collection has no entry");

assert.equal(collectionUsageLabel(3), "In 3 automations");
assert.equal(collectionUsageLabel(1), "In 1 automation");
assert.equal(collectionUsageLabel(0), null, "zero falls back to the updated date");
assert.equal(collectionUsageLabel(undefined), null);

console.log("collection usage tests passed");
