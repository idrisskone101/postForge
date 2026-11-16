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
      const image = manifest.asset(`images/seed/${slide.image}.jpg`);
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

type SlideCopy = {
  /** File name under images/seed, without the extension. */
  image: string;
  eyebrow: string;
  headline: string;
  body: string;
};

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
    title: "Why you understand Spanish but freeze when you speak",
    description: "Problem and fix carousel, draft for next week.",
    caption: "Understanding and speaking are two different skills. Here is how to train the second one. #learnspanish #languagelearning",
    status: "draft",
    age: { hours: 19 },
    exports: [],
    slides: [
      { image: "sc1", eyebrow: "", headline: "You understand Spanish but freeze when you speak", body: "It is not your memory. It is your practice." },
      { image: "sc2", eyebrow: "01", headline: "You trained your eyes, not your mouth", body: "Flashcards and tapping teach you to recognise words." },
      { image: "sc3", eyebrow: "02", headline: "Speaking is its own skill", body: "It only grows when you say things out loud." },
      { image: "sc4", eyebrow: "03", headline: "Practise the real moments", body: "Ordering, small talk, asking for directions." },
      { image: "sc5", eyebrow: "", headline: "Ten minutes of talking a day", body: "Saylo's tutor answers back, so you stop freezing." },
    ],
  },
  {
    prefix: "sb",
    title: "I spoke Spanish with my partner's grandma for the first time",
    description: "Story carousel with Marcus. Best performer of the launch.",
    caption: "Two years of nodding along at family dinners. Then ten minutes a night with Saylo. #learnspanish #storytime",
    status: "ready",
    age: { days: 3, hours: 3 },
    exports: [{ days: 3, hours: 1 }],
    slides: [
      { image: "sb1", eyebrow: "", headline: "I spoke Spanish with my partner's grandma for the first time", body: "Two years of nodding along at dinner. Not anymore." },
      { image: "sb2", eyebrow: "Week 1", headline: "Ten minutes a night", body: "I practised real conversations with an AI tutor before bed." },
      { image: "sb3", eyebrow: "Week 6", headline: "The first sentence was the hardest", body: "She switched to Spanish and never switched back." },
      { image: "sb4", eyebrow: "Week 8", headline: "Then she told me stories", body: "Ones my partner had never heard either." },
      { image: "g11-app-nightstand-streak", eyebrow: "", headline: "Start with tonight", body: "Saylo builds the conversations you actually need." },
    ],
  },
  {
    prefix: "sa",
    title: "3 Spanish phrases textbooks never teach you",
    description: "Phrase listicle, first carousel of the launch.",
    caption: "The phrases you actually hear in Mexico City. Save this before your trip. #learnspanish #mexicocity",
    status: "ready",
    age: { days: 6 },
    exports: [{ days: 5, hours: 22 }, { days: 4, hours: 6 }],
    slides: [
      { image: "sa1", eyebrow: "", headline: "3 Spanish phrases textbooks never teach you", body: "And locals use them every day" },
      { image: "sa2", eyebrow: "01", headline: "¿Qué onda?", body: "What's up. Use it with friends instead of ¿Cómo estás?" },
      { image: "sa3", eyebrow: "02", headline: "Ahorita", body: "Right now. Which can mean in five minutes, or never." },
      { image: "sa4", eyebrow: "03", headline: "Me late", body: "I'm into it. Say it when a plan sounds good." },
      { image: "g10-app-cafe-conversation", eyebrow: "", headline: "Say them out loud", body: "Saylo's tutor listens and corrects your accent." },
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
      id: demoId("slideshow-automation:weekly-phrases"),
      projectId: projectIdFor("sa"),
      name: "Weekly Spanish phrase drops",
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
          "3 Spanish phrases textbooks never teach you",
          "5 ways to order coffee like a local",
          "Phrases that make the waiter smile",
        ],
        visualPolicy: "reuse",
        imageModel: "nano-banana-2",
        imageCollectionId: COLLECTION_IDS.streets,
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
      id: demoId("slideshow-automation:story-series"),
      projectId: projectIdFor("sb"),
      name: "First real conversation stories",
      status: "paused",
      schedule: {
        cadence: "Sun · 10:30",
        weekdays: ["Sun"],
        time: "10:30",
        timezone: "America/Toronto",
      },
      contentSettings: {
        preventRepeats: true,
        hooks: [
          "I spoke Spanish with my partner's grandma for the first time",
          "The day I ordered in Italian without panicking",
        ],
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
