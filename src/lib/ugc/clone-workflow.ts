import { MAX_MOTION_SOURCE_DURATION_SEC } from "@/lib/ugc/source-limits";

type TikTokVideoInfo = {
  id: string;
  localPath: string;
};

type ReferenceImagePost = <T>(path: string, body: unknown) => Promise<T>;

export type CloneReferenceImageEntry = {
  jobId: string;
  fileId: string | null;
  prompt: string;
  cost: number;
  status: "generating" | "completed" | "failed";
  error?: string;
};

export type ClonePrimaryActionState = {
  sourceReady: boolean;
  trimReady: boolean;
  identityReady: boolean;
  referenceReady: boolean;
  canGenerate: boolean;
  usesSavedReference: boolean;
};

export type ClonePrimaryAction = {
  label: string;
  detail: string;
};

export async function createReferenceImageBatchEntries({
  batchSize,
  videoInfo,
  avatarId,
  prompt,
  imageModel,
  unitCost,
  hairstyleRole = null,
  post,
}: {
  batchSize: number;
  videoInfo: Pick<TikTokVideoInfo, "id" | "localPath">;
  avatarId: string;
  prompt: string;
  imageModel: string;
  unitCost: number;
  hairstyleRole?: string | null;
  post: ReferenceImagePost;
}): Promise<CloneReferenceImageEntry[]> {
  const batchResults = await Promise.all(
    Array.from({ length: batchSize }, () =>
      post<{ id: string; estimatedCost?: number }>("/api/ugc-clone/reference-image", {
        tiktokVideoPath: videoInfo.localPath,
        tiktokSourceId: videoInfo.id,
        avatarId,
        prompt: prompt || undefined,
        imageModel,
        ...(hairstyleRole ? { hairstyleRole } : {}),
      }),
    ),
  );

  return batchResults.map((result) => ({
    jobId: result.id,
    fileId: null,
    prompt,
    cost: result.estimatedCost ?? unitCost,
    status: "generating" as const,
  }));
}

export function getClonePrimaryAction({
  sourceReady,
  trimReady,
  identityReady,
  referenceReady,
  canGenerate,
  usesSavedReference,
}: ClonePrimaryActionState): ClonePrimaryAction {
  if (!sourceReady) {
    return {
      label: "Add source",
      detail: "Paste a TikTok URL or choose a saved source.",
    };
  }

  if (!trimReady) {
    return {
      label: "Trim source",
      detail: `Trim the source to ${MAX_MOTION_SOURCE_DURATION_SEC} seconds or less.`,
    };
  }

  if (!identityReady) {
    return {
      label: "Choose identity",
      detail: "Select the avatar for this clone.",
    };
  }

  if (canGenerate || referenceReady) {
    return {
      label: "Generate clone",
      detail: usesSavedReference
        ? "Use the selected reference to start video generation."
        : "Use the generated reference to start video generation.",
    };
  }

  return {
    label: "Generate reference",
    detail: "Create or choose the reference image first.",
  };
}
