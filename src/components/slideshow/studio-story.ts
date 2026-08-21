import { requestSlideshowStory } from "@/lib/slideshow/client";

import type { SlideshowProject, SlideshowStoryGenerateInput } from "./types";

export async function generateStudioStory(
  input: SlideshowStoryGenerateInput,
  apiBaseUrl: string,
): Promise<{ project: SlideshowProject; toast: string }> {
  const project = await requestSlideshowStory(input, apiBaseUrl);
  const providerLabel =
    project.generationProvider === "ollama"
      ? project.generationModel || "DeepSeek V4 Flash"
      : "local fallback";
  return {
    project,
    toast: project.generationWarning
      ? `Local story fallback used: ${project.generationWarning}`
      : `Slideshow written with ${providerLabel}.`,
  };
}
