import { createAutomationRecord, type AutomationRecord } from "@/lib/automations";
import type { CollectionAssetRecord, CollectionRecord } from "@/lib/collections";
import { DEMO_WORKSPACE_NAME } from "@/lib/demo/mode";
import type { PerformanceDataset } from "@/lib/performance/csv";
import type { PromptTemplateRecord } from "@/lib/prompt-templates";
import type { DemoManifest } from "./manifest";
import { basename, before, demoId, type Age } from "./seed-utils";
import type { DemoSeedPart } from "./types";

export const COLLECTION_IDS = {
  streets: demoId("collection:cafes-and-streets-abroad"),
  desk: demoId("collection:study-desk-details"),
} as const;

/**
 * Workspace JSON features: Collections, Workspace Automations, Prompt
 * Templates, workspace settings, and one imported performance report.
 *
 * No Connection is seeded. TikTok, Instagram, and YouTube stay "not
 * connected", so every Workspace Automation here is a review-draft loop and
 * Performance reads only the local CSV dataset, which is named as a sample.
 */
export function buildWorkspaceSeed(manifest: DemoManifest, now: Date): DemoSeedPart {
  const settings = {
    id: "workspace-settings",
    workspaceName: DEMO_WORKSPACE_NAME,
    timezone: "America/Toronto",
    approvalDefault: true,
    emailFailures: true,
    emailApprovals: true,
    updatedAt: before(now, { days: 16 }).toISOString(),
  };
  return {
    features: {
      collections: collectionRecords(manifest, now),
      automations: automationRecords(now),
      "prompt-templates": promptTemplates(now),
      connections: [settings, performanceDataset(now)],
    },
  };
}

const COLLECTIONS = [
  {
    id: COLLECTION_IDS.streets,
    name: "Cafés and streets abroad",
    prefix: "ca",
    age: { days: 13, hours: 2 },
    labels: ["Lisbon tram street", "Mexico City café", "Tokyo lantern alley", "Roman piazza", "Paris bakery", "Barcelona market"],
  },
  {
    id: COLLECTION_IDS.desk,
    name: "Study desk details",
    prefix: "cb",
    age: { days: 9, hours: 5 },
    labels: ["Flashcards", "Verb table", "Earbuds and notes", "Passport and boarding pass", "Phone and cortado", "Mirror sticky notes"],
  },
] as const;

function collectionRecords(
  manifest: DemoManifest,
  now: Date
): Array<CollectionRecord | CollectionAssetRecord> {
  const records: Array<CollectionRecord | CollectionAssetRecord> = [];
  for (const collection of COLLECTIONS) {
    const createdAt = before(now, collection.age).toISOString();
    const assets = collection.labels.map((label, index): CollectionAssetRecord => {
      const asset = manifest.asset(`collection-assets/seed/${collection.prefix}${index + 1}.jpg`);
      return {
        id: demoId(`collection-asset:${asset.path}`),
        kind: "asset",
        name: label,
        filename: basename(asset.path),
        mimeType: asset.mimeType,
        fileSizeBytes: asset.fileSizeBytes,
        localPath: asset.path,
        createdAt,
      };
    });
    records.push(
      {
        id: collection.id,
        kind: "collection",
        name: collection.name,
        assetIds: assets.map((asset) => asset.id),
        createdAt,
        updatedAt: createdAt,
      },
      ...assets
    );
  }
  return records;
}

type AutomationSample = {
  key: string;
  template: string;
  name: string;
  status: AutomationRecord["status"];
  days: string[];
  time: string;
  hook: string;
  guidance: string;
  collectionId: string | null;
  created: Age;
  lastRun: Age | null;
};

const AUTOMATIONS: AutomationSample[] = [
  {
    key: "phrase-of-the-day",
    template: "quick-wins",
    name: "Phrase of the day",
    status: "paused",
    days: ["Tue", "Thu", "Sat"],
    time: "08:30",
    hook: "3 phrases that save you in any café abroad",
    guidance: "One phrase per slide: what it means and when locals actually use it.",
    collectionId: COLLECTION_IDS.streets,
    created: { days: 12 },
    lastRun: { days: 2, hours: 3 },
  },
  {
    key: "language-myths",
    template: "myth-reality",
    name: "Language myths, corrected",
    status: "paused",
    days: ["Mon", "Fri"],
    time: "12:00",
    hook: "No, you do not need to be fluent before your trip",
    guidance: "Name the myth, show what actually happens, then give the simple rule.",
    collectionId: COLLECTION_IDS.desk,
    created: { days: 8 },
    lastRun: { days: 4, hours: 1 },
  },
  {
    key: "first-conversation",
    template: "story-lesson",
    name: "First real conversation stories",
    status: "draft",
    days: ["Wed"],
    time: "18:15",
    hook: "I spoke Spanish with my partner's grandma for the first time",
    guidance: "Tell it as a short personal story with one milestone per slide.",
    collectionId: null,
    created: { days: 1, hours: 4 },
    lastRun: null,
  },
];

function automationRecords(now: Date): AutomationRecord[] {
  return AUTOMATIONS.map((sample) => {
    const createdAt = before(now, sample.created).toISOString();
    const base = createAutomationRecord(sample.template, { timezone: "America/Toronto" });
    return {
      ...base,
      id: `automation_demo_${sample.key}`,
      name: sample.name,
      status: sample.status,
      schedule: { ...base.schedule, days: sample.days, time: sample.time },
      hook: { ...base.hook, selected: sample.hook },
      content: {
        ...base.content,
        guidance: sample.guidance,
        collectionId: sample.collectionId,
      },
      createdAt,
      updatedAt: sample.lastRun ? before(now, sample.lastRun).toISOString() : createdAt,
      lastRunAt: sample.lastRun ? before(now, sample.lastRun).toISOString() : null,
      executionEnabled: false,
    };
  });
}

function promptTemplates(now: Date): PromptTemplateRecord[] {
  const templates = [
    {
      key: "creator-abroad",
      name: "Creator at a café abroad",
      prompt:
        "The same person as in the reference image, sitting at a small outdoor café table in [city], ordering from a waiter at the edge of the frame, mid sentence and confident, golden light, vertical candid travel photo, photorealistic. No text, no logos, no watermarks.",
    },
    {
      key: "app-on-phone",
      name: "Saylo screen on a phone",
      prompt:
        "Vertical candid lifestyle photo of a phone in [scene]. The screen clearly shows the Saylo language app: warm cream background, deep indigo text, coral accent, rounded sans-serif type. Screen content: [exact on-screen text]. All on-screen text spelled exactly as written. No other text, no logos.",
    },
    {
      key: "desk-flat-lay",
      name: "Study desk flat lay",
      prompt:
        "Overhead flat lay of [items] on a light oak desk, soft diffused daylight, tidy editorial arrangement, warm natural palette, photorealistic. No logos, no watermarks.",
    },
  ];
  return templates.map((template, index) => {
    const createdAt = before(now, { days: 14 - index * 3 }).toISOString();
    return {
      id: demoId(`prompt-template:${template.key}`),
      kind: "prompt-template",
      name: template.name,
      prompt: template.prompt,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

/**
 * Rows of the sample report: title, days ago, views, likes, comments, shares,
 * saves. Every title is a post that exists in this workspace, so a visitor can
 * trace the best performer back to the slideshow and creator behind it.
 */
const SAMPLE_POSTS: ReadonlyArray<readonly [string, number, number, number, number, number, number]> = [
  ["I spoke Spanish with my partner's grandma for the first time", 3, 312_400, 41_900, 2_310, 9_840, 18_600],
  ["POV: the waiter answered in Spanish (Marcus)", 1, 96_800, 9_120, 640, 2_210, 3_050],
  ["3 Spanish phrases textbooks never teach you", 5, 74_300, 6_880, 412, 3_960, 11_200],
  ["Grandma laughing at my Spanish", 1, 58_200, 7_340, 518, 1_420, 2_260],
  ["Ordering in Rome with Ava", 1, 21_600, 1_980, 133, 310, 720],
  ["Saylo café role-play, screen demo", 2, 18_900, 1_410, 96, 240, 1_130],
  ["How long it takes to learn Spanish, honestly", 14, 15_300, 1_220, 188, 205, 940],
  ["Why apps do not make you fluent", 9, 12_400, 980, 154, 170, 610],
  ["5 phrases to learn before you board", 8, 9_860, 760, 41, 120, 880],
  ["Rome at golden hour, phrase of the day", 11, 7_450, 690, 22, 64, 210],
  ["The fridge label method", 12, 6_120, 470, 35, 52, 390],
];

function performanceDataset(now: Date): PerformanceDataset {
  return {
    id: "performance-dataset",
    source: "csv",
    accountLabel: "saylo-sample-posts.csv",
    importedAt: before(now, { hours: 6 }).toISOString(),
    posts: SAMPLE_POSTS.map(([title, daysAgo, views, likes, comments, shares, saves], index) => ({
      id: `sample-post-${index + 1}`,
      title,
      views,
      likes,
      comments,
      shares,
      saves,
      publishedAt: before(now, { days: daysAgo, hours: 3 }).toISOString(),
    })),
  };
}
