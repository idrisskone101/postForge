import { prisma } from "@/lib/db";
import { badRequest, notFound, revisionConflict } from "@/lib/slideshow/errors";
import {
  claimProject,
  getProjectRecord,
  inputJson,
  readString,
  recordOrEmpty,
} from "@/lib/slideshow/persist-shared";
import {
  optionalString,
  requireRecord,
  requireRevision,
  type JsonRecord,
} from "@/lib/slideshow/validation";

export type SlideshowGenerationJobReservation = {
  model: string;
  prompt: string;
  input: JsonRecord;
  estimatedCost: number;
  tags: string[];
};

export async function prepareSlideImageGeneration(
  projectId: string,
  slideId: string,
  input: unknown,
) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  const requestedPrompt = optionalString(body, "prompt", { max: 2_000 });
  const project = await getProjectRecord(projectId);
  if (project.revision !== revision) revisionConflict(project.revision);
  const slide = project.slides.find((candidate) => candidate.id === slideId);
  if (!slide) notFound("Slide");
  const prompt = requestedPrompt ?? slide.imagePrompt;
  if (!prompt) badRequest("The slide needs an image prompt before generation");
  const settings = recordOrEmpty(project.settings);
  return {
    prompt,
    aspectRatio: readString(settings.aspectRatio, "9:16"),
    expectedRevision: revision,
  };
}

export async function reserveSlideGenerationJob(
  projectId: string,
  slideId: string,
  expectedRevision: number,
  reservation: SlideshowGenerationJobReservation,
) {
  return prisma.$transaction(async (tx) => {
    await claimProject(tx, projectId, expectedRevision);
    const slide = await tx.slideshowSlide.findFirst({
      where: { id: slideId, projectId },
      select: { id: true },
    });
    if (!slide) notFound("Slide");
    const job = await tx.generationJob.create({
      data: {
        type: "image",
        model: reservation.model,
        prompt: reservation.prompt,
        input: inputJson(reservation.input),
        estimatedCost: reservation.estimatedCost,
        status: "queued",
        tags: reservation.tags,
      },
    });
    await tx.slideshowSlide.update({
      where: { id: slideId },
      data: {
        generationJobId: job.id,
        generatedFileId: null,
        imageUrl: null,
      },
    });
    return { jobId: job.id, projectRevision: expectedRevision + 1 };
  });
}

export async function attachSlideshowGeneratedFile(
  generationJobId: string,
  generatedFileId: string,
) {
  return prisma.$transaction(async (tx) => {
    const fileUrl = `/api/files/${generatedFileId}`;
    const initialLinks = await tx.slideshowSlide.findMany({
      where: { generationJobId },
      select: { projectId: true },
    });
    const projectIds = Array.from(
      new Set(initialLinks.map((slide) => slide.projectId)),
    );
    if (!projectIds.length) return;

    // Lock the owning projects before reconciling their slide rows. Completion
    // is a distinct server mutation, so changed projects receive a new revision;
    // stale autosaves then fail instead of erasing the generated image.
    await tx.slideshowProject.updateMany({
      where: { id: { in: projectIds } },
      data: { updatedAt: new Date() },
    });
    const linkedSlides = await tx.slideshowSlide.findMany({
      where: { generationJobId },
      select: {
        id: true,
        projectId: true,
        generatedFileId: true,
        imageUrl: true,
      },
    });
    const changedSlides = linkedSlides.filter(
      (slide) =>
        slide.generatedFileId !== generatedFileId || slide.imageUrl !== fileUrl,
    );
    if (!changedSlides.length) return;

    await tx.slideshowSlide.updateMany({
      where: { id: { in: changedSlides.map((slide) => slide.id) } },
      data: { generatedFileId, imageUrl: fileUrl },
    });
    const changedProjectIds = Array.from(
      new Set(changedSlides.map((slide) => slide.projectId)),
    );
    await tx.slideshowProject.updateMany({
      where: { id: { in: changedProjectIds } },
      data: { revision: { increment: 1 } },
    });
  });
}
