import { apiPost } from "@/lib/api/client";

type CloneVideoSource = {
  id: string;
  localPath: string;
};

export type CloneGenerateTarget =
  | { kind: "swap"; referenceFileId: string }
  | { kind: "generated"; referenceImageFileId: string }
  | { kind: "saved"; savedReferenceId: string }
  | { kind: "collection"; collectionAssetId: string };

export async function postCloneGeneration(input: {
  target: CloneGenerateTarget;
  videoInfo: CloneVideoSource;
  avatarId: string;
  model: string;
  keepOriginalSound: boolean;
  removeTextOverlays: boolean;
  durationSec: number;
}): Promise<{ id: string; href: string }> {
  switch (input.target.kind) {
    case "swap": {
      const result = await apiPost<{ id: string }>("/api/generate/swap", {
        prompt:
          "Replace the subject in the video with the reference subject. Keep the video, motion, camera, and everything else identical.",
        model: input.model,
        swapVideoId: input.videoInfo.id,
        referenceFileId: input.target.referenceFileId,
        keepOriginalSound: input.keepOriginalSound,
      });
      return { id: result.id, href: `/generate/${result.id}` };
    }
    case "generated": {
      const result = await apiPost<{ id: string }>("/api/ugc-clone/generate", {
        tiktokSourceId: input.videoInfo.id,
        tiktokVideoPath: input.videoInfo.localPath,
        avatarId: input.avatarId,
        keepOriginalSound: input.keepOriginalSound,
        removeTextOverlays: input.removeTextOverlays,
        model: input.model,
        referenceImageFileId: input.target.referenceImageFileId,
        durationSec: input.durationSec,
      });
      return { id: result.id, href: `/ugc-clone/${result.id}` };
    }
    case "saved": {
      const result = await apiPost<{ id: string }>("/api/ugc-clone/generate", {
        tiktokVideoPath: input.videoInfo.localPath,
        tiktokSourceId: input.videoInfo.id,
        avatarId: input.avatarId,
        keepOriginalSound: input.keepOriginalSound,
        removeTextOverlays: input.removeTextOverlays,
        model: input.model,
        savedReferenceId: input.target.savedReferenceId,
        durationSec: input.durationSec,
      });
      return { id: result.id, href: `/ugc-clone/${result.id}` };
    }
    case "collection": {
      const result = await apiPost<{ id: string }>("/api/ugc-clone/generate", {
        tiktokVideoPath: input.videoInfo.localPath,
        tiktokSourceId: input.videoInfo.id,
        avatarId: input.avatarId,
        keepOriginalSound: input.keepOriginalSound,
        removeTextOverlays: input.removeTextOverlays,
        model: input.model,
        collectionAssetId: input.target.collectionAssetId,
        durationSec: input.durationSec,
      });
      return { id: result.id, href: `/ugc-clone/${result.id}` };
    }
    default: {
      const _exhaustive: never = input.target;
      return _exhaustive;
    }
  }
}

export function swapReferenceBlockedMessage(
  kind: Extract<CloneGenerateTarget["kind"], "saved" | "collection">
): string {
  switch (kind) {
    case "saved":
      return "Saved references are not used by swap models. Generate a fresh reference image instead.";
    case "collection":
      return "Collection references are not used by swap models. Generate a fresh reference image instead.";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
