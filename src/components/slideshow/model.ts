import type {
  SlideshowPhase,
  SlideshowProject,
  SlideshowSlide,
} from "./types";

export const MIN_SLIDESHOW_SLIDES = 1;
export const MAX_SLIDESHOW_SLIDES = 20;

export function nextLocalSlideId(project: SlideshowProject) {
  const existing = new Set(project.slides.map((slide) => slide.id));
  let serial = project.slides.length + 1;
  let candidate = `local-slide-${project.id}-${serial}`;

  while (existing.has(candidate)) {
    serial += 1;
    candidate = `local-slide-${project.id}-${serial}`;
  }

  return candidate;
}

export function phaseForSlideIndex(
  index: number,
  slideCount: number,
  includeCta: boolean,
): SlideshowPhase {
  if (index === 0) return "hook";
  if (includeCta && slideCount > 1 && index === slideCount - 1) return "cta";
  return "body";
}

export function normalizeSlideshowSlides(
  slides: SlideshowSlide[],
  includeCta: boolean,
): SlideshowSlide[] {
  const normalized = slides
    .slice(0, MAX_SLIDESHOW_SLIDES)
    .map((slide, index, current) => ({
      ...slide,
      order: index,
      role: phaseForSlideIndex(index, current.length, includeCta),
    }));

  return normalized;
}

export function createAddedSlide(
  source?: Partial<SlideshowSlide>,
  id = "local-slide-new",
): SlideshowSlide {
  return {
    order: 0,
    role: "body",
    eyebrow: "Next point",
    headline: "Add one clear idea that keeps the story moving.",
    body: "Use a specific example, proof point, or practical detail here.",
    prompt:
      "One concrete lesson with a believable example. Avoid generic advice.",
    visualKey: "blue-studio",
    ...source,
    id,
    clientId: id,
  };
}

export function addSlideshowSlide(
  project: SlideshowProject,
  afterIndex?: number,
): SlideshowProject {
  if (project.slides.length >= MAX_SLIDESHOW_SLIDES) return project;

  const lastBodyPosition = project.includeCta
    ? Math.max(1, project.slides.length - 1)
    : project.slides.length;
  const requestedPosition =
    afterIndex === undefined ? lastBodyPosition : afterIndex + 1;
  const insertAt = Math.max(1, Math.min(requestedPosition, lastBodyPosition));
  const visualKeys = [
    "blue-studio",
    "lime-paper",
    "violet-dusk",
    "mint-room",
    "paper-stack",
    "sunset-blocks",
  ];
  const slide = createAddedSlide(
    {
      visualKey: visualKeys[project.slides.length % visualKeys.length],
    },
    nextLocalSlideId(project),
  );
  const slides = [...project.slides];
  slides.splice(insertAt, 0, slide);

  return {
    ...project,
    slides: normalizeSlideshowSlides(slides, project.includeCta),
  };
}

export function duplicateSlideshowSlide(
  project: SlideshowProject,
  index: number,
): SlideshowProject {
  if (
    project.slides.length >= MAX_SLIDESHOW_SLIDES ||
    index < 0 ||
    index >= project.slides.length
  ) {
    return project;
  }

  const source = project.slides[index];
  const duplicate = createAddedSlide(
    {
      ...source,
      role: "body",
      eyebrow: `${source.eyebrow} · variation`,
    },
    nextLocalSlideId(project),
  );
  const slides = [...project.slides];
  const insertAt =
    source.role === "cta" ? Math.max(1, slides.length - 1) : index + 1;
  slides.splice(insertAt, 0, duplicate);

  return {
    ...project,
    slides: normalizeSlideshowSlides(slides, project.includeCta),
  };
}

export function deleteSlideshowSlide(
  project: SlideshowProject,
  index: number,
): SlideshowProject {
  if (
    project.slides.length <= MIN_SLIDESHOW_SLIDES ||
    index < 0 ||
    index >= project.slides.length
  ) {
    return project;
  }

  const slides = project.slides.filter((_, slideIndex) => slideIndex !== index);
  const includeCta = project.includeCta && slides.length > 1;

  return {
    ...project,
    includeCta,
    slides: normalizeSlideshowSlides(slides, includeCta),
  };
}

export function moveSlideshowSlide(
  project: SlideshowProject,
  fromIndex: number,
  toIndex: number,
): SlideshowProject {
  if (
    fromIndex < 0 ||
    fromIndex >= project.slides.length ||
    toIndex < 0 ||
    toIndex >= project.slides.length ||
    fromIndex === toIndex
  ) {
    return project;
  }

  const slides = [...project.slides];
  const [moved] = slides.splice(fromIndex, 1);
  slides.splice(toIndex, 0, moved);

  return {
    ...project,
    slides: normalizeSlideshowSlides(slides, project.includeCta),
  };
}

export function reorderSlideshowSlides(
  project: SlideshowProject,
  slideIds: string[],
): SlideshowProject {
  if (
    slideIds.length !== project.slides.length ||
    new Set(slideIds).size !== project.slides.length
  ) {
    return project;
  }

  const byId = new Map(project.slides.map((slide) => [slide.id, slide]));
  const ordered = slideIds.map((id) => byId.get(id));
  if (ordered.some((slide) => !slide)) return project;

  return {
    ...project,
    slides: normalizeSlideshowSlides(
      ordered as SlideshowSlide[],
      project.includeCta,
    ),
  };
}

export function updateSlideshowSlide(
  project: SlideshowProject,
  slideId: string,
  patch: Partial<SlideshowSlide>,
): SlideshowProject {
  return {
    ...project,
    slides: project.slides.map((slide) =>
      slide.id === slideId ? { ...slide, ...patch, id: slide.id } : slide,
    ),
  };
}

export function alignCreatorDirectImages(input: {
  hookAssetId: string | null;
  slideLines: readonly string[];
  slideAssetIds: readonly (string | null)[];
}): Array<string | null> {
  const aligned: Array<string | null> = [input.hookAssetId];
  input.slideLines.forEach((line, index) => {
    if (line.trim().length > 0) {
      aligned.push(input.slideAssetIds[index] ?? null);
    }
  });
  return aligned;
}

export function applyDirectSlideshowImages(
  project: SlideshowProject,
  imageUrls: readonly (string | null | undefined)[],
): SlideshowProject {
  if (!imageUrls.some((url) => typeof url === "string" && url.trim().length > 0)) {
    return project;
  }
  const slides = project.slides.map((slide, index) => {
    const url = imageUrls[index];
    if (typeof url !== "string" || !url.trim()) {
      return { ...slide, imageUrl: slide.imageUrl ?? null };
    }
    return { ...slide, imageUrl: url };
  });
  return {
    ...project,
    status: slides.every((slide) => Boolean(slide.imageUrl))
      ? "ready"
      : project.status,
    slides,
  };
}

export function setSlideshowCta(
  project: SlideshowProject,
  includeCta: boolean,
): SlideshowProject {
  if (includeCta === project.includeCta) return project;

  if (includeCta && project.slides.length === 1) {
    const withBody = addSlideshowSlide({ ...project, includeCta: false });
    return {
      ...withBody,
      includeCta: true,
      slides: normalizeSlideshowSlides(withBody.slides, true),
    };
  }

  return {
    ...project,
    includeCta,
    slides: normalizeSlideshowSlides(project.slides, includeCta),
  };
}
