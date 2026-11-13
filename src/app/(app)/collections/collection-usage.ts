import { isAutomationRecord } from "@/lib/automations";
import { readSlideshowAutomationVisualSettings } from "@/lib/slideshow/automation-visuals";

/** Collection id to the number of automations that draw their images from it. */
export type CollectionUsage = Record<string, number>;

/**
 * A video automation names its collection in `content.collectionId`. A carousel schedule uses one
 * only while its visual policy reuses saved images; a fresh-AI schedule ignores the stored id.
 */
export function countCollectionUsage(
  automationRecords: readonly unknown[],
  carouselContentSettings: readonly unknown[]
): CollectionUsage {
  const usage: CollectionUsage = {};
  const add = (id: string | null | undefined) => {
    if (id) usage[id] = (usage[id] ?? 0) + 1;
  };
  for (const record of automationRecords) {
    if (isAutomationRecord(record)) add(record.content.collectionId);
  }
  for (const settings of carouselContentSettings) {
    const visuals = readSlideshowAutomationVisualSettings(settings);
    if (visuals.policy === "reuse") add(visuals.imageCollectionId);
  }
  return usage;
}

export function collectionUsageLabel(count: number | undefined) {
  if (!count) return null;
  return count === 1 ? "In 1 automation" : `In ${count} automations`;
}
