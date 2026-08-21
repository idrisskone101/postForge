import type { SlideshowProjectStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  MAX_SLIDES_PER_PROJECT,
  SLIDESHOW_PROJECT_STATUSES,
} from "@/lib/slideshow/constants";
import { badRequest, notFound, revisionConflict } from "@/lib/slideshow/errors";
import {
  claimProject,
  getProjectRecord,
  inputJson,
  jsonWithoutClientId,
  optionalDescription,
  parseFullSlide,
  projectInclude,
  projectLayoutFrom,
  projectSettingsFrom,
  recordOrEmpty,
  slideCreateData,
  toSlideshowProjectDto,
} from "@/lib/slideshow/persist-shared";
import { replaceProjectSlides } from "@/lib/slideshow/persist-slides";
import {
  cloneJson,
  optionalEnum,
  optionalString,
  requireRecord,
  requireRevision,
} from "@/lib/slideshow/validation";

export { toSlideshowProjectDto } from "@/lib/slideshow/persist-shared";
export {
  addSlideshowSlide,
  deleteSlideshowSlide,
  getSlideshowSlide,
  listSlideshowSlides,
  reorderSlideshowSlides,
  updateSlideshowSlide,
} from "@/lib/slideshow/persist-slides";
export {
  attachSlideshowGeneratedFile,
  prepareSlideImageGeneration,
  reserveSlideGenerationJob,
  type SlideshowGenerationJobReservation,
} from "@/lib/slideshow/persist-generation";
export {
  createSlideshowAutomation,
  deleteSlideshowAutomation,
  getSlideshowAutomation,
  listSlideshowAutomations,
  updateSlideshowAutomation,
} from "@/lib/slideshow/persist-automations";
export { getSlideshowRenderProject } from "@/lib/slideshow/persist-render";

export async function recordSlideshowExport(
  id: string,
  format: "photo-carousel" | "mp4",
  exportedAt = new Date(),
) {
  return prisma.$transaction(async (tx) => {
    // Updating the row first is an explicit lock shared with editor saves. We
    // intentionally do not increment the editor revision for analytics-only
    // metadata, so a completed download cannot make the open editor stale.
    const locked = await tx.slideshowProject.updateMany({
      where: { id },
      data: { updatedAt: exportedAt },
    });
    if (locked.count !== 1) notFound("Slideshow");

    const current = await tx.slideshowProject.findUnique({
      where: { id },
      select: { settings: true },
    });
    if (!current) notFound("Slideshow");
    const settings = cloneJson(recordOrEmpty(current.settings));
    const previousHistory = Array.isArray(settings.exportHistory)
      ? settings.exportHistory.filter(
          (value): value is string =>
            typeof value === "string" && Number.isFinite(Date.parse(value)),
        )
      : [];
    const history = [...previousHistory, exportedAt.toISOString()].slice(-500);
    const previousCount =
      typeof settings.successfulExportCount === "number" &&
      Number.isSafeInteger(settings.successfulExportCount) &&
      settings.successfulExportCount >= 0
        ? settings.successfulExportCount
        : previousHistory.length;
    const successfulExportCount = previousCount + 1;
    settings.successfulExportCount = successfulExportCount;
    settings.lastExportedAt = exportedAt.toISOString();
    settings.lastExportFormat = format;
    settings.exportHistory = history;

    await tx.slideshowProject.update({
      where: { id },
      data: { settings: inputJson(settings) },
    });
    return {
      successfulExportCount,
      exportedAt: exportedAt.toISOString(),
      format,
      history,
    };
  });
}

export async function getSlideshowProject(id: string) {
  return toSlideshowProjectDto(await getProjectRecord(id));
}

export async function createSlideshowProject(input: unknown) {
  const body = requireRecord(input);
  const title = optionalString(body, "title", { max: 160 }) ?? "Untitled slideshow";
  const description = optionalDescription(body);
  const status = optionalEnum(body, "status", SLIDESHOW_PROJECT_STATUSES) ?? "draft";
  const slides = body.slides;
  if (slides !== undefined && !Array.isArray(slides)) {
    badRequest("slides must be an array");
  }
  if (Array.isArray(slides) && slides.length > MAX_SLIDES_PER_PROJECT) {
    badRequest(`A slideshow can contain at most ${MAX_SLIDES_PER_PROJECT} slides`);
  }

  const parsedSlides = (slides ?? []).map((value, position) => {
    const parsed = parseFullSlide(value);
    return {
      position,
      ...slideCreateData(parsed),
    };
  });

  const project = await prisma.slideshowProject.create({
    data: {
      title,
      ...(description !== undefined ? { description } : {}),
      status: status as SlideshowProjectStatus,
      settings: projectSettingsFrom(body),
      layout: projectLayoutFrom(body),
      slides: parsedSlides.length ? { create: parsedSlides } : undefined,
    },
    include: projectInclude,
  });
  return toSlideshowProjectDto(project);
}

export async function updateSlideshowProject(id: string, input: unknown) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  return prisma.$transaction(async (tx) => {
    await claimProject(tx, id, revision);
    const current = await getProjectRecord(id, tx);
    const title = optionalString(body, "title", { max: 160 });
    const description = optionalDescription(body);
    const status = optionalEnum(body, "status", SLIDESHOW_PROJECT_STATUSES);
    const hasSettingsAliases = [
      "settings",
      "aspectRatio",
      "phaseSettings",
      "textSettings",
      "includeCta",
      "preventRepeats",
      "language",
      "templateId",
    ].some((key) => body[key] !== undefined);

    if (body.slides !== undefined) {
      if (!Array.isArray(body.slides)) badRequest("slides must be an array");
      await replaceProjectSlides(tx, id, body.slides);
    }

    await tx.slideshowProject.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status !== undefined
          ? { status: status as SlideshowProjectStatus }
          : {}),
        ...(hasSettingsAliases
          ? { settings: projectSettingsFrom(body, current.settings) }
          : {}),
        ...(body.layout !== undefined
          ? { layout: projectLayoutFrom(body, current.layout) }
          : {}),
      },
    });
    return toSlideshowProjectDto(await getProjectRecord(id, tx));
  });
}

export async function deleteSlideshowProject(id: string, input: unknown) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  await prisma.$transaction(async (tx) => {
    await claimProject(tx, id, revision);
    await tx.slideshowProject.delete({ where: { id } });
  });
}

export async function duplicateSlideshowProject(id: string, input: unknown) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  const source = await getProjectRecord(id);
  if (source.revision !== revision) revisionConflict(source.revision);
  const requestedTitle = optionalString(body, "title", { max: 160 });

  const duplicate = await prisma.slideshowProject.create({
    data: {
      title: requestedTitle ?? `Copy of ${source.title}`.slice(0, 160),
      description: source.description,
      status: "draft",
      settings: jsonWithoutClientId(source.settings),
      layout: inputJson(source.layout),
      slides: source.slides.length
        ? {
            create: source.slides.map((slide) => ({
              position: slide.position,
              kind: slide.kind,
              imageUrl: slide.imageUrl,
              imagePrompt: slide.imagePrompt,
              generationJobId: slide.generationJobId,
              generatedFileId: slide.generatedFileId,
              sourceImageId: slide.sourceImageId,
              content: jsonWithoutClientId(slide.content),
              settings: inputJson(slide.settings),
              layout: inputJson(slide.layout),
            })),
          }
        : undefined,
    },
    include: projectInclude,
  });
  return toSlideshowProjectDto(duplicate);
}
