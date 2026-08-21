import type { SlideshowRenderProject } from "@/lib/ai/slideshow-renderer";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { resolvePlatformCollectionImageLocalPaths } from "@/lib/slideshow/platform-collections";
import {
  getProjectRecord,
  readString,
  recordOrEmpty,
  serializeSlide,
  toSlideshowProjectDto,
} from "@/lib/slideshow/persist-shared";

export async function getSlideshowRenderProject(
  id: string,
): Promise<SlideshowRenderProject> {
  const project = await getProjectRecord(id);
  const serialized = toSlideshowProjectDto(project);
  const phaseSettings = recordOrEmpty(serialized.phaseSettings);
  const rawTextSettings = recordOrEmpty(serialized.textSettings);
  const style = readString(rawTextSettings.style, "outline");
  const position = readString(rawTextSettings.position, "center");
  const align = readString(rawTextSettings.align, "center");
  const padding = readString(rawTextSettings.padding, "padded");
  const color = readString(rawTextSettings.color, "white");
  const textSettings: NonNullable<SlideshowRenderProject["textSettings"]> = {
    font: readString(rawTextSettings.font, "Poppins"),
    color:
      color === "custom"
        ? readString(rawTextSettings.customColor, "#ffffff")
        : color,
    style:
      style === "solid" ||
      style === "light" ||
      style === "translucent" ||
      style === "plain"
        ? style
        : ("outline" as const),
    size:
      typeof rawTextSettings.size === "number" ? rawTextSettings.size : 56,
    position:
      position === "top" || position === "bottom"
        ? position
        : ("center" as const),
    width:
      typeof rawTextSettings.width === "number" ? rawTextSettings.width : 88,
    align:
      align === "left" || align === "right" ? align : ("center" as const),
    padding: padding === "flush" ? "flush" : ("padded" as const),
    backgroundRadius:
      typeof rawTextSettings.backgroundRadius === "number"
        ? rawTextSettings.backgroundRadius
        : 4,
  };

  const generatedFileIds = project.slides
    .map((slide) => slide.generatedFileId)
    .filter((value): value is string => !!value);
  const generationJobIds = project.slides
    .map((slide) => slide.generationJobId)
    .filter((value): value is string => !!value);
  const generatedFiles =
    generatedFileIds.length || generationJobIds.length
      ? await prisma.generatedFile.findMany({
          where: {
            OR: [
              ...(generatedFileIds.length
                ? [{ id: { in: generatedFileIds } }]
                : []),
              ...(generationJobIds.length
                ? [{ jobId: { in: generationJobIds } }]
                : []),
            ],
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, jobId: true, localPath: true, data: true },
        })
      : [];
  const filesById = new Map(generatedFiles.map((file) => [file.id, file]));
  const firstFileByJob = new Map<string, (typeof generatedFiles)[number]>();
  for (const file of generatedFiles) {
    if (!firstFileByJob.has(file.jobId)) firstFileByJob.set(file.jobId, file);
  }

  const imageBuffers = new Map<string, Buffer>();
  await Promise.all(
    project.slides.map(async (slide) => {
      const file =
        (slide.generatedFileId ? filesById.get(slide.generatedFileId) : undefined) ??
        (slide.generationJobId
          ? firstFileByJob.get(slide.generationJobId)
          : undefined);
      if (!file) return;
      try {
        const buffer = file.localPath
          ? await storage.read(file.localPath)
          : file.data
            ? Buffer.from(file.data)
            : null;
        if (buffer?.length) imageBuffers.set(slide.id, buffer);
      } catch (error) {
        console.warn(
          `[slideshow-export] Could not load generated image ${file.id}:`,
          error,
        );
      }
    }),
  );

  const reusableImageUrls = Array.from(
    new Set(
      project.slides.flatMap((slide) => {
        const content = recordOrEmpty(slide.content);
        const imageUrls = Array.isArray(content.imageUrls)
          ? content.imageUrls.filter(
              (value): value is string => typeof value === "string",
            )
          : [];
        return [slide.imageUrl, ...imageUrls].filter(
          (value): value is string => Boolean(value),
        );
      }),
    ),
  );
  const reusableImages = reusableImageUrls.length
    ? await resolvePlatformCollectionImageLocalPaths(reusableImageUrls)
    : [];
  const reusableImageBuffers = new Map<string, Buffer>();
  await Promise.all(
    reusableImages.map(async (image) => {
      if (!image.localPath) return;
      try {
        const buffer = await storage.read(image.localPath);
        if (buffer.length) reusableImageBuffers.set(image.url, buffer);
      } catch (error) {
        console.warn(
          `[slideshow-export] Could not load collection image ${image.url}:`,
          error,
        );
      }
    }),
  );

  return {
    id: project.id,
    title: project.title,
    aspectRatio: serialized.aspectRatio,
    textSettings,
    slides: project.slides.map((slide) => {
      const serializedSlide = serializeSlide(slide);
      const phase = serializedSlide.kind;
      const phaseSetting = recordOrEmpty(phaseSettings[phase]);
      const reusableBuffers = serializedSlide.imageUrls.map(
        (url) => reusableImageBuffers.get(url) ?? null,
      );
      const hasExplicitCollectionImages = serializedSlide.imageUrls.length > 0;
      return {
        id: slide.id,
        eyebrow: serializedSlide.eyebrow,
        headline: serializedSlide.headline,
        body: serializedSlide.body,
        imageUrl: slide.imageUrl,
        imageUrls: serializedSlide.imageUrls,
        imageBuffer:
          (hasExplicitCollectionImages
            ? reusableBuffers[0] ?? null
            : imageBuffers.get(slide.id) ??
              (slide.imageUrl ? reusableImageBuffers.get(slide.imageUrl) : null)) ??
          null,
        imageBuffers: reusableBuffers.some(Boolean) ? reusableBuffers : undefined,
        visualKey: serializedSlide.visualKey,
        visualKeys: serializedSlide.visualKeys,
        grid: readString(phaseSetting.grid, "none") as
          | "none"
          | "1:2"
          | "1:3"
          | "2:1"
          | "2:2",
        overlayEnabled:
          typeof phaseSetting.overlayEnabled === "boolean"
            ? phaseSetting.overlayEnabled
            : true,
        overlayOpacity:
          typeof phaseSetting.overlayOpacity === "number"
            ? phaseSetting.overlayOpacity
            : 45,
        displayText:
          typeof phaseSetting.displayText === "boolean"
            ? phaseSetting.displayText
            : true,
      };
    }),
  };
}
