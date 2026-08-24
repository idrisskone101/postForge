type GenerateStudioStory = typeof import("./studio-story").generateStudioStory;
type GenerateStudioCreatorProject =
  typeof import("./studio-creator-generate").generateStudioCreatorProject;
type SaveStudioProject = typeof import("./studio-editor-actions").saveStudioProject;
type RegenerateStudioSlide =
  typeof import("./studio-editor-actions").regenerateStudioSlide;
type RegenerateStudioSlideImage =
  typeof import("./studio-editor-actions").regenerateStudioSlideImage;
type ExportStudioSlideshow = typeof import("./studio-export").exportStudioSlideshow;
type WatchStudioDrafts = typeof import("./studio-drafts-load").watchStudioDrafts;
type WatchStudioDraftsRefresh =
  typeof import("./studio-drafts-load").watchStudioDraftsRefresh;

// Lazy wrappers keep generate/export/draft code off the first-paint slideshow bundle.

export async function generateStudioStory(
  ...args: Parameters<GenerateStudioStory>
): ReturnType<GenerateStudioStory> {
  const mod = await import("./studio-story");
  return mod.generateStudioStory(...args);
}

export async function generateStudioCreatorProject(
  ...args: Parameters<GenerateStudioCreatorProject>
): ReturnType<GenerateStudioCreatorProject> {
  const mod = await import("./studio-creator-generate");
  return mod.generateStudioCreatorProject(...args);
}

export async function saveStudioProject(
  ...args: Parameters<SaveStudioProject>
): ReturnType<SaveStudioProject> {
  const mod = await import("./studio-editor-actions");
  return mod.saveStudioProject(...args);
}

export async function regenerateStudioSlide(
  ...args: Parameters<RegenerateStudioSlide>
): ReturnType<RegenerateStudioSlide> {
  const mod = await import("./studio-editor-actions");
  return mod.regenerateStudioSlide(...args);
}

export async function regenerateStudioSlideImage(
  ...args: Parameters<RegenerateStudioSlideImage>
): ReturnType<RegenerateStudioSlideImage> {
  const mod = await import("./studio-editor-actions");
  return mod.regenerateStudioSlideImage(...args);
}

export async function exportStudioSlideshow(
  ...args: Parameters<ExportStudioSlideshow>
): ReturnType<ExportStudioSlideshow> {
  const mod = await import("./studio-export");
  return mod.exportStudioSlideshow(...args);
}

export async function connectStudioDrafts(
  ...args: Parameters<WatchStudioDrafts>
): Promise<ReturnType<WatchStudioDrafts>> {
  if (!args[0]?.enabled) return () => undefined;
  const mod = await import("./studio-drafts-load");
  return mod.watchStudioDrafts(...args);
}

export async function connectStudioDraftsRefresh(
  ...args: Parameters<WatchStudioDraftsRefresh>
): Promise<ReturnType<WatchStudioDraftsRefresh>> {
  if (!args[0]?.enabled) return () => undefined;
  const mod = await import("./studio-drafts-load");
  return mod.watchStudioDraftsRefresh(...args);
}
