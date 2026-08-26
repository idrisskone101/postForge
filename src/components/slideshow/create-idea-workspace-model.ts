import { getStoryModel } from "@/lib/ai/story-models";

export async function readWorkspaceStoryModelName(): Promise<string | null> {
  try {
    const response = await fetch("/api/settings/models");
    if (!response.ok) return null;
    const data = (await response.json()) as {
      availability?: { defaultIntelligenceModelId?: string | null };
    };
    const resolved = getStoryModel(data.availability?.defaultIntelligenceModelId);
    return resolved?.name ?? null;
  } catch {
    return null;
  }
}
