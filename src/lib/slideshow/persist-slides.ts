import { prisma } from "@/lib/db";
import { MAX_SLIDES_PER_PROJECT } from "@/lib/slideshow/constants";
import { badRequest, notFound } from "@/lib/slideshow/errors";
import {
  claimProject,
  getProjectRecord,
  parseFullSlide,
  serializeSlide,
  slideCreateData,
  toSlideshowProjectDto,
  type SlideshowTransaction,
} from "@/lib/slideshow/persist-shared";
import {
  isRecord,
  optionalId,
  optionalInteger,
  requireRecord,
  requireRevision,
} from "@/lib/slideshow/validation";

async function setSlidePositions(
  tx: SlideshowTransaction,
  projectId: string,
  orderedIds: string[],
) {
  if (!orderedIds.length) return;
  const offset = orderedIds.length + MAX_SLIDES_PER_PROJECT + 1;
  await tx.slideshowSlide.updateMany({
    where: { projectId, id: { in: orderedIds } },
    data: { position: { increment: offset } },
  });
  for (let position = 0; position < orderedIds.length; position += 1) {
    await tx.slideshowSlide.update({
      where: { id: orderedIds[position] },
      data: { position },
    });
  }
}

export async function replaceProjectSlides(
  tx: SlideshowTransaction,
  projectId: string,
  values: unknown[],
) {
  if (values.length > MAX_SLIDES_PER_PROJECT) {
    badRequest(`A slideshow can contain at most ${MAX_SLIDES_PER_PROJECT} slides`);
  }

  const existing = await tx.slideshowSlide.findMany({
    where: { projectId },
    orderBy: { position: "asc" },
  });
  const existingById = new Map(existing.map((slide) => [slide.id, slide]));
  const requestedIds = values
    .map((value) => (isRecord(value) ? optionalId(value, "id") : undefined))
    .filter((value): value is string => !!value);
  if (new Set(requestedIds).size !== requestedIds.length) {
    badRequest("slides must not contain duplicate ids");
  }
  for (const id of requestedIds) {
    if (!existingById.has(id)) {
      badRequest(`Slide ${id} does not belong to this slideshow`);
    }
  }

  const offset = existing.length + values.length + MAX_SLIDES_PER_PROJECT + 1;
  if (existing.length) {
    await tx.slideshowSlide.updateMany({
      where: { projectId },
      data: { position: { increment: offset } },
    });
  }
  await tx.slideshowSlide.deleteMany({
    where: {
      projectId,
      ...(requestedIds.length ? { id: { notIn: requestedIds } } : {}),
    },
  });

  for (let position = 0; position < values.length; position += 1) {
    const raw = requireRecord(values[position], `slides[${position}]`);
    const id = optionalId(raw, "id");
    const parsed = parseFullSlide(raw, id ? existingById.get(id) : undefined);
    const data = { position, ...slideCreateData(parsed) };
    if (id) {
      await tx.slideshowSlide.update({ where: { id }, data });
    } else {
      await tx.slideshowSlide.create({ data: { projectId, ...data } });
    }
  }
}

export async function listSlideshowSlides(projectId: string) {
  const project = await getProjectRecord(projectId);
  return {
    projectId,
    revision: project.revision,
    slides: project.slides.map(serializeSlide),
  };
}

export async function getSlideshowSlide(projectId: string, slideId: string) {
  const project = await getProjectRecord(projectId);
  const slide = project.slides.find((candidate) => candidate.id === slideId);
  if (!slide) notFound("Slide");
  return {
    projectId,
    revision: project.revision,
    slide: serializeSlide(slide),
  };
}

export async function addSlideshowSlide(projectId: string, input: unknown) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  return prisma.$transaction(async (tx) => {
    await claimProject(tx, projectId, revision);
    const existing = await tx.slideshowSlide.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
    });
    if (existing.length >= MAX_SLIDES_PER_PROJECT) {
      badRequest(`A slideshow can contain at most ${MAX_SLIDES_PER_PROJECT} slides`);
    }
    const requestedPosition = optionalInteger(body, "position", {
      min: 0,
      max: existing.length,
    });
    const position = requestedPosition ?? existing.length;
    const parsed = parseFullSlide(body);
    const created = await tx.slideshowSlide.create({
      data: {
        projectId,
        position: existing.length,
        ...slideCreateData(parsed),
      },
    });
    const ids = existing.map((slide) => slide.id);
    ids.splice(position, 0, created.id);
    await setSlidePositions(tx, projectId, ids);
    return toSlideshowProjectDto(await getProjectRecord(projectId, tx));
  });
}

export async function updateSlideshowSlide(
  projectId: string,
  slideId: string,
  input: unknown,
) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  return prisma.$transaction(async (tx) => {
    await claimProject(tx, projectId, revision);
    const current = await tx.slideshowSlide.findFirst({
      where: { id: slideId, projectId },
    });
    if (!current) notFound("Slide");
    const parsed = parseFullSlide(body, current);
    await tx.slideshowSlide.update({
      where: { id: slideId },
      data: slideCreateData(parsed),
    });
    return toSlideshowProjectDto(await getProjectRecord(projectId, tx));
  });
}

export async function deleteSlideshowSlide(
  projectId: string,
  slideId: string,
  input: unknown,
) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  return prisma.$transaction(async (tx) => {
    await claimProject(tx, projectId, revision);
    const slide = await tx.slideshowSlide.findFirst({
      where: { id: slideId, projectId },
      select: { id: true },
    });
    if (!slide) notFound("Slide");
    await tx.slideshowSlide.delete({ where: { id: slideId } });
    const remaining = await tx.slideshowSlide.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    await setSlidePositions(
      tx,
      projectId,
      remaining.map((item) => item.id),
    );
    return toSlideshowProjectDto(await getProjectRecord(projectId, tx));
  });
}

export async function reorderSlideshowSlides(projectId: string, input: unknown) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  if (!Array.isArray(body.slideIds) || !body.slideIds.every((id) => typeof id === "string")) {
    badRequest("slideIds must be an array of slide ids");
  }
  const slideIds = body.slideIds as string[];
  if (new Set(slideIds).size !== slideIds.length) {
    badRequest("slideIds must not contain duplicates");
  }

  return prisma.$transaction(async (tx) => {
    await claimProject(tx, projectId, revision);
    const current = await tx.slideshowSlide.findMany({
      where: { projectId },
      select: { id: true },
    });
    const currentIds = new Set(current.map((slide) => slide.id));
    if (
      currentIds.size !== slideIds.length ||
      slideIds.some((id) => !currentIds.has(id))
    ) {
      badRequest("slideIds must contain every slide exactly once");
    }
    await setSlidePositions(tx, projectId, slideIds);
    return toSlideshowProjectDto(await getProjectRecord(projectId, tx));
  });
}
