import { createAutomationRecord, type AutomationRecord } from "@/lib/automations";
import type { CollectionAssetRecord, CollectionRecord } from "@/lib/collections";
import { DEMO_WORKSPACE_NAME } from "@/lib/demo/mode";
import type { PerformanceDataset } from "@/lib/performance/csv";
import type { PromptTemplateRecord } from "@/lib/prompt-templates";
import type { DemoManifest } from "./manifest";
import { basename, before, demoId, type Age } from "./seed-utils";
import type { DemoSeedPart } from "./types";

export const COLLECTION_IDS = {
  sunlit: demoId("collection:sunlit-apartment-jungle"),
  terracotta: demoId("collection:terracotta-and-soil"),
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
    id: COLLECTION_IDS.sunlit,
    name: "Sunlit apartment jungle",
    prefix: "ca",
    age: { days: 13, hours: 2 },
    labels: ["Living room", "Bedroom corner", "Bathroom shelf", "Kitchen windowsill", "Hallway", "Home office"],
  },
  {
    id: COLLECTION_IDS.terracotta,
    name: "Terracotta and soil details",
    prefix: "cb",
    age: { days: 9, hours: 5 },
    labels: ["Pot rim", "Potting soil", "Exposed roots", "Backlit leaf veins", "Water droplets", "Stacked pots"],
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
    key: "quick-wins",
    template: "quick-wins",
    name: "3 quick plant wins",
    status: "paused",
    days: ["Tue", "Thu", "Sat"],
    time: "08:30",
    hook: "3 fixes for a drooping plant you can do today",
    guidance: "One practical tip per slide, written the way a friend would say it.",
    collectionId: COLLECTION_IDS.sunlit,
    created: { days: 12 },
    lastRun: { days: 2, hours: 3 },
  },
  {
    key: "myth-reality",
    template: "myth-reality",
    name: "Plant myths, corrected",
    status: "paused",
    days: ["Mon", "Fri"],
    time: "12:00",
    hook: "No, your plant does not need water every day",
    guidance: "Name the myth, show what actually happens, then give the simple rule.",
    collectionId: COLLECTION_IDS.terracotta,
    created: { days: 8 },
    lastRun: { days: 4, hours: 1 },
  },
  {
    key: "story-lesson",
    template: "story-lesson",
    name: "What my first monstera taught me",
    status: "draft",
    days: ["Wed"],
    time: "18:15",
    hook: "I nearly killed my first monstera in a month",
    guidance: "Tell it as a short personal story with one lesson per slide.",
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
      key: "window-light",
      name: "Window-light lifestyle shot",
      prompt:
        "Vertical lifestyle photo of [subject] beside a bright window, soft morning light, shallow depth of field, warm natural tones, shot on a smartphone, photorealistic. No text, no logos.",
    },
    {
      key: "flat-lay",
      name: "Tidy overhead flat lay",
      prompt:
        "Overhead flat lay of [items] on a light oak table, soft diffused daylight, tidy editorial arrangement, earthy palette, photorealistic. No text, no logos.",
    },
    {
      key: "creator-to-camera",
      name: "Creator talking to camera",
      prompt:
        "Vertical smartphone still of [creator] holding [object] at chest height and talking to the camera, bright living room, natural daylight, candid creator look, photorealistic. No text, no captions.",
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

/** Rows of the sample report: title, days ago, views, likes, comments, shares, saves. */
const SAMPLE_POSTS: ReadonlyArray<readonly [string, number, number, number, number, number, number]> = [
  ["3 houseplants that survive anything", 4, 48_200, 5_310, 212, 1_480, 6_920],
  ["Why your monstera has yellow leaves", 2, 21_700, 2_040, 164, 590, 2_310],
  ["Snake plant intro with Maya", 1, 9_850, 870, 61, 140, 402],
  ["The watering mistake almost everyone makes", 7, 33_900, 3_480, 298, 1_120, 4_050],
  ["Repotting day flat lay", 9, 6_420, 512, 23, 48, 190],
  ["Low-light plants that actually grow", 11, 27_300, 2_760, 143, 820, 3_640],
  ["Peace lily, before and after", 13, 14_100, 1_390, 97, 260, 880],
  ["Reading nook plant tour", 16, 8_240, 705, 38, 92, 310],
  ["Balcony herbs in ten minutes a week", 18, 17_600, 1_820, 121, 430, 1_540],
  ["What my first monstera taught me", 21, 11_300, 1_040, 204, 180, 620],
  ["Wipe your leaves, here is why", 24, 5_180, 398, 19, 41, 150],
  ["Unboxing a plant delivery", 27, 7_910, 640, 44, 77, 205],
];

function performanceDataset(now: Date): PerformanceDataset {
  return {
    id: "performance-dataset",
    source: "csv",
    accountLabel: "loamly-sample-posts.csv",
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
