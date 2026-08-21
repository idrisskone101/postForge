import type {
  Prisma,
  SlideshowSlideKind,
} from "@/generated/prisma/client";
import {
  generateSlideshowStory,
  type SlideshowStoryInput,
} from "@/lib/ai/slideshow-story";
import { readPlatformCollection } from "@/lib/slideshow/platform-collections";
import {
  copySlideshowAutomationSourceContent,
  jsonObject,
  readBoolean,
  readString,
  recordOrEmpty,
} from "@/lib/slideshow/automation-copy";
import {
  hookPool,
  selectSlideshowAutomationHook,
  usedHookPool,
} from "@/lib/slideshow/automation-hooks";
import { readSlideshowAutomationVisualSettings } from "@/lib/slideshow/automation-visuals";
import {
  DEFAULT_SLIDE_CONTENT,
  DEFAULT_SLIDE_LAYOUT,
  DEFAULT_SLIDE_SETTINGS,
  MAX_SLIDES_PER_PROJECT,
} from "@/lib/slideshow/constants";
import { slideKindFromStoryRole } from "@/lib/slideshow/project";

export const automationInclude = {
  project: {
    include: {
      slides: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
    },
  },
} satisfies Prisma.SlideshowAutomationInclude;

export type AutomationCandidate = Prisma.SlideshowAutomationGetPayload<{
  include: typeof automationInclude;
}>;
type SourceProject = NonNullable<AutomationCandidate["project"]>;
type SourceSlide = SourceProject["slides"][number];
export type ReusableCollectionImage = {
  id: string;
  url: string;
};

function readSlideCount(value: unknown, fallback: number) {
  const count =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : fallback;
  return Math.max(1, Math.min(MAX_SLIDES_PER_PROJECT, count));
}

function sourceHeadline(project: SourceProject | null) {
  const content = recordOrEmpty(project?.slides[0]?.content);
  return readString(content.headline) ?? readString(content.heading);
}

export function storyPlanFor(automation: AutomationCandidate, scheduledFor: Date) {
  const content = recordOrEmpty(automation.contentSettings);
  const projectSettings = recordOrEmpty(automation.project?.settings);
  const hooks = hookPool(content);
  const preventRepeats =
    readBoolean(content.preventRepeats) ??
    readBoolean(projectSettings.preventRepeats) ??
    true;
  const usedHooks = preventRepeats ? usedHookPool(content, hooks) : [];
  const selection = selectSlideshowAutomationHook({
    automationId: automation.id,
    scheduledFor,
    hooks,
    usedHooks,
    preventRepeats,
  });
  const selectedHook = selection.selectedHook;
  const idea =
    selectedHook ??
    readString(content.idea) ??
    readString(content.topic) ??
    readString(content.subject) ??
    readString(content.prompt) ??
    sourceHeadline(automation.project) ??
    readString(automation.project?.description) ??
    readString(automation.project?.title) ??
    automation.name;
  const sourceSlideCount = automation.project?.slides.length || 7;

  const input: SlideshowStoryInput = {
    idea,
    slideCount: readSlideCount(content.slideCount, sourceSlideCount),
    language:
      readString(content.language) ??
      readString(projectSettings.language) ??
      "English",
    tone: readString(content.tone),
    audience: readString(content.audience),
    includeCta:
      readBoolean(content.includeCta) ??
      readBoolean(projectSettings.includeCta) ??
      true,
  };

  if (!selection.nextUsedHooks) return { input };
  return {
    input,
    nextContentSettings: jsonObject(
      {
        ...content,
        usedHooks: selection.nextUsedHooks,
      },
      {},
    ),
  };
}

function sourceSlideFor(
  source: SourceProject | null,
  position: number,
  kind: SlideshowSlideKind,
): SourceSlide | undefined {
  return (
    source?.slides[position] ??
    source?.slides.find((slide) => slide.kind === kind) ??
    source?.slides.at(-1)
  );
}

export async function reusableCollectionImages(
  contentSettings: unknown,
): Promise<ReusableCollectionImage[]> {
  const { policy, imageCollectionId } =
    readSlideshowAutomationVisualSettings(contentSettings);
  if (policy !== "reuse" || !imageCollectionId) return [];

  const collection = await readPlatformCollection(imageCollectionId);
  return collection?.images ?? [];
}

export function generatedSlideData(
  source: SourceProject | null,
  story: Awaited<ReturnType<typeof generateSlideshowStory>>,
  options: {
    reuseVisuals: boolean;
    collectionImages: ReusableCollectionImage[];
  },
) {
  return story.slides.map((slide, position) => {
    const kind = slideKindFromStoryRole(slide.role);
    const sourceSlide = sourceSlideFor(source, position, kind);
    const collectionImage = options.collectionImages.length
      ? options.collectionImages[position % options.collectionImages.length]
      : undefined;
    const sourceContent = copySlideshowAutomationSourceContent(
      sourceSlide?.content,
      options.reuseVisuals,
    );
    const eyebrow =
      kind === "hook"
        ? "Hook"
        : kind === "cta"
          ? "Call to action"
          : `Point ${position + 1}`;
    return {
      position,
      kind,
      // Reuse is intentionally the default and makes no paid request. A
      // hook-pool-only automation can cycle through one saved collection.
      imageUrl: options.reuseVisuals
        ? (sourceSlide?.imageUrl ?? collectionImage?.url ?? null)
        : null,
      imagePrompt: slide.imagePrompt,
      generationJobId: options.reuseVisuals
        ? (sourceSlide?.generationJobId ?? null)
        : null,
      generatedFileId: options.reuseVisuals
        ? (sourceSlide?.generatedFileId ?? null)
        : null,
      sourceImageId: options.reuseVisuals
        ? (sourceSlide?.sourceImageId ?? collectionImage?.id ?? null)
        : null,
      content: jsonObject(
        {
          ...sourceContent,
          eyebrow,
          headline: slide.heading,
          body: slide.body,
          textItems: [
            { id: `automation-${position}-eyebrow`, role: "eyebrow", text: eyebrow },
            {
              id: `automation-${position}-headline`,
              role: "headline",
              text: slide.heading,
            },
            { id: `automation-${position}-body`, role: "body", text: slide.body },
          ],
        },
        DEFAULT_SLIDE_CONTENT,
      ),
      settings: jsonObject(sourceSlide?.settings, DEFAULT_SLIDE_SETTINGS),
      layout: jsonObject(sourceSlide?.layout, DEFAULT_SLIDE_LAYOUT),
    };
  });
}
