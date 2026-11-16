import type { SlideshowProjectStatus } from "@/generated/prisma/client";
import {
  DEFAULT_PROJECT_LAYOUT,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_SLIDE_SETTINGS,
  type SlideshowSlideKindValue,
} from "@/lib/slideshow/constants";
import { fileIdFor, jobIdFor } from "./generation";
import type { DemoManifest } from "./manifest";
import { before, demoId, type Age } from "./seed-utils";
import type { DemoSeedPart } from "./types";
import { COLLECTION_IDS } from "./workspace";

const TEXT = DEFAULT_PROJECT_SETTINGS.textSettings;

/**
 * Three sample Slideshow Projects in the shape the studio itself saves, plus
 * two Slideshow Automations. Every slide points at a sample Generated File.
 */
export function buildSlideshowSeed(manifest: DemoManifest, now: Date): DemoSeedPart {
  const part: Required<Pick<DemoSeedPart, "projects" | "slides" | "slideshowAutomations">> = {
    projects: [],
    slides: [],
    slideshowAutomations: [],
  };

  for (const project of PROJECTS) {
    const projectId = projectIdFor(project.prefix);
    const updatedAt = before(now, project.age);
    const exportedAt = project.exports.map((age) => before(now, age).toISOString());

    part.projects.push({
      id: projectId,
      title: project.title,
      description: project.description,
      status: project.status,
      settings: {
        aspectRatio: "9:16",
        imageGrid: "none",
        darkOverlay: { enabled: true, opacity: 45 },
        displayText: true,
        phaseSettings: DEFAULT_PROJECT_SETTINGS.phaseSettings,
        textSettings: TEXT,
        includeCta: true,
        preventRepeats: true,
        language: "English",
        caption: project.caption,
        generationProvider: null,
        generationWarning: null,
        templateId: null,
        creator: null,
        clientId: projectId,
        ...(exportedAt.length > 0
          ? {
              successfulExportCount: exportedAt.length,
              lastExportedAt: exportedAt.at(-1),
              lastExportFormat: "photo-carousel",
              exportHistory: exportedAt,
            }
          : {}),
      },
      layout: { aspectRatio: "9:16", safeArea: DEFAULT_PROJECT_LAYOUT.safeArea },
      revision: 3,
      createdAt: new Date(updatedAt.getTime() - 35 * 60_000),
      updatedAt,
    });

    project.slides.forEach((slide, position) => {
      const image = manifest.asset(`images/seed/${project.prefix}${position + 1}.jpg`);
      const slideId = demoId(`slide:${project.prefix}${position + 1}`);
      part.slides.push({
        id: slideId,
        projectId,
        position,
        kind: slideKind(position, project.slides.length),
        imageUrl: `/api/files/${fileIdFor(image.path)}`,
        imagePrompt: image.prompt,
        generationJobId: jobIdFor(image.path),
        generatedFileId: fileIdFor(image.path),
        content: {
          clientId: slideId,
          eyebrow: slide.eyebrow,
          headline: slide.headline,
          body: slide.body,
          prompt: image.prompt,
          visualKey: VISUAL_KEYS[position % VISUAL_KEYS.length],
          visualKeys: [],
          imageUrls: [],
          textItems: [
            { id: `${slideId}-eyebrow`, role: "eyebrow", text: slide.eyebrow },
            { id: `${slideId}-headline`, role: "headline", text: slide.headline },
            { id: `${slideId}-body`, role: "body", text: slide.body },
          ],
        },
        settings: {
          fontFamily: TEXT.font,
          fontSize: TEXT.size,
          textColor: DEFAULT_SLIDE_SETTINGS.textColor,
          textStyle: TEXT.style,
          textAlign: TEXT.align,
          verticalPosition: TEXT.position,
          textWidth: TEXT.width,
          backgroundRadius: TEXT.backgroundRadius,
          padded: true,
        },
        layout: { text: { x: 50, y: 50, width: TEXT.width } },
        createdAt: updatedAt,
        updatedAt,
      });
    });
  }

  part.slideshowAutomations.push(...slideshowAutomations(now));
  return part;
}

type SlideCopy = { eyebrow: string; headline: string; body: string };

type SampleProject = {
  prefix: "sa" | "sb" | "sc";
  title: string;
  description: string;
  caption: string;
  status: SlideshowProjectStatus;
  age: Age;
  exports: Age[];
  slides: SlideCopy[];
};

const VISUAL_KEYS = ["mint-room", "lime-paper", "paper-stack", "coral-glow", "blue-studio"];

const PROJECTS: SampleProject[] = [
  {
    prefix: "sc",
    title: "The 10-minute Sunday plant reset",
    description: "Routine carousel for the weekend series.",
    caption: "Ten minutes on Sunday keeps every plant alive through the week. #plantcare #houseplants",
    status: "draft",
    age: { hours: 19 },
    exports: [],
    slides: [
      { eyebrow: "", headline: "The 10-minute Sunday plant reset", body: "A small routine that keeps everything alive" },
      { eyebrow: "Step 1", headline: "Water what is dry", body: "Check the soil with a finger before you pour." },
      { eyebrow: "Step 2", headline: "Wipe the leaves", body: "Dust blocks light. A damp cloth is enough." },
      { eyebrow: "Step 3", headline: "Rotate each pot", body: "A quarter turn keeps growth even." },
      { eyebrow: "", headline: "Make it a habit", body: "Loamly sets the reminder so Sunday takes care of itself." },
    ],
  },
  {
    prefix: "sb",
    title: "Why your monstera has yellow leaves",
    description: "Problem and fix carousel for the monstera series.",
    caption: "Yellow leaves are a message, not a death sentence. Three causes and the fix for each. #monstera #plantcare",
    status: "ready",
    age: { days: 3, hours: 3 },
    exports: [],
    slides: [
      { eyebrow: "", headline: "Your monstera is trying to tell you something", body: "Yellow leaves usually mean one of three things" },
      { eyebrow: "01", headline: "Too much water", body: "Soggy soil suffocates roots. Let the top 5 cm dry out first." },
      { eyebrow: "02", headline: "Not enough light", body: "A dark corner slows growth and fades the older leaves." },
      { eyebrow: "03", headline: "It has outgrown its pot", body: "Roots circling the bottom mean it is time to size up." },
      { eyebrow: "", headline: "Track it in Loamly", body: "Log watering and light so the next leaf comes in green." },
    ],
  },
  {
    prefix: "sa",
    title: "3 houseplants that survive anything",
    description: "Beginner listicle, first carousel in the series.",
    caption: "Three plants that forgive a missed week (or three). Save this for your next plant shop trip. #houseplants #beginnerplants",
    status: "ready",
    age: { days: 6 },
    exports: [{ days: 5, hours: 22 }, { days: 4, hours: 6 }],
    slides: [
      { eyebrow: "", headline: "3 houseplants that survive anything", body: "Even if you forget them for weeks" },
      { eyebrow: "01", headline: "Snake plant", body: "Low light, dry soil, total neglect. It just keeps going." },
      { eyebrow: "02", headline: "Golden pothos", body: "Trails anywhere and droops to tell you it is thirsty." },
      { eyebrow: "03", headline: "ZZ plant", body: "Stores water in its roots, so a missed month is fine." },
      { eyebrow: "", headline: "Not sure when to water?", body: "Loamly reminds you for each plant." },
    ],
  },
];

function projectIdFor(prefix: SampleProject["prefix"]) {
  return demoId(`slideshow:${prefix}`);
}

function slideKind(position: number, count: number): SlideshowSlideKindValue {
  if (position === 0) return "hook";
  return position === count - 1 ? "cta" : "content";
}

function slideshowAutomations(now: Date): NonNullable<DemoSeedPart["slideshowAutomations"]> {
  const weeklyRuns = [{ days: 9 }, { days: 7 }, { days: 4 }, { days: 2 }].map((age) =>
    before(now, age)
  );
  const nextRun = new Date(now.getTime() + 22 * 60 * 60_000);

  return [
    {
      id: demoId("slideshow-automation:weekly-tips"),
      projectId: projectIdFor("sa"),
      name: "Weekly plant-care tips",
      status: "active",
      schedule: {
        cadence: "Mon, Wed, Fri · 09:00",
        weekdays: ["Mon", "Wed", "Fri"],
        time: "09:00",
        timezone: "America/Toronto",
      },
      contentSettings: {
        preventRepeats: true,
        hooks: [
          "3 houseplants that survive anything",
          "The watering mistake almost everyone makes",
          "Low-light plants that actually grow",
        ],
        visualPolicy: "reuse",
        imageModel: "nano-banana-2",
        imageCollectionId: COLLECTION_IDS.sunlit,
        successfulRunCount: weeklyRuns.length,
        runHistory: weeklyRuns.map((run) => run.toISOString()),
      },
      publishSettings: { mode: "draft" },
      revision: 5,
      lastRunAt: weeklyRuns.at(-1),
      nextRunAt: nextRun,
      createdAt: before(now, { days: 12 }),
      updatedAt: before(now, { days: 2 }),
    },
    {
      id: demoId("slideshow-automation:sunday-reset"),
      projectId: projectIdFor("sc"),
      name: "Sunday reset series",
      status: "paused",
      schedule: {
        cadence: "Sun · 10:30",
        weekdays: ["Sun"],
        time: "10:30",
        timezone: "America/Toronto",
      },
      contentSettings: {
        preventRepeats: true,
        hooks: ["The 10-minute Sunday plant reset", "Reset your plant shelf in one coffee"],
        visualPolicy: "fresh-ai",
        imageModel: "nano-banana-2",
        successfulRunCount: 0,
        runHistory: [],
      },
      publishSettings: { mode: "draft" },
      revision: 1,
      createdAt: before(now, { hours: 18 }),
      updatedAt: before(now, { hours: 18 }),
    },
  ];
}
