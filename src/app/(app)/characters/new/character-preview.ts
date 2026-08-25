import { apiGet } from "@/lib/api/client";
import type { CharacterAttributes } from "@/lib/character-attributes";

async function portraitFile(sourceUrl: string, characterId: string) {
  const response = await fetch(sourceUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Character preview image could not be loaded.");
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error("Character preview did not return a valid image.");
  }
  const extension = blob.type.includes("png") ? "png" : "jpg";
  return new File([blob], `${characterId}.${extension}`, { type: blob.type });
}

export async function saveCharacterAvatar({
  currentAvatarId,
  characterId,
  name,
  attributes,
  previewSeed,
  previewFingerprint,
  previewSourceUrl,
}: {
  currentAvatarId: string | null;
  characterId: string;
  name: string;
  attributes: CharacterAttributes;
  previewSeed: number;
  previewFingerprint: string;
  previewSourceUrl: string;
}) {
  const file = await portraitFile(previewSourceUrl, characterId);
  const formData = new FormData();
  formData.set("file", file);
  formData.set("name", name);
  formData.set("origin", "generated");
  formData.set(
    "provenance",
    JSON.stringify({
      avatarProfile: {
        characterId,
        attributes,
        previewSeed,
        previewFingerprint,
        previewKind: "photographic",
      },
      seedReferenceImages: [],
    })
  );
  let response = currentAvatarId
    ? await fetch(`/api/avatars/${encodeURIComponent(currentAvatarId)}`, {
        method: "PUT",
        body: formData,
      })
    : null;
  if (!response || response.status === 404) {
    response = await fetch("/api/avatars", { method: "POST", body: formData });
  }
  const payload = (await response.json().catch(() => null)) as
    | { id?: string; error?: string }
    | null;
  if (!response.ok || !payload?.id) {
    throw new Error(payload?.error ?? "Reusable avatar could not be saved.");
  }
  return payload.id;
}

type CharacterPreviewJob = {
  status: "queued" | "processing" | "completed" | "failed" | string;
  error?: string | null;
  outputs: Array<{ id: string }>;
};

export async function waitForCharacterPreview(jobId: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const job = await apiGet<CharacterPreviewJob>(
      `/api/jobs/${encodeURIComponent(jobId)}`
    );
    if (job.status === "completed") {
      const output = job.outputs[0];
      if (!output) throw new Error("The provider completed without a portrait image.");
      return output.id;
    }
    if (job.status === "failed") {
      throw new Error(job.error ?? "Character preview generation failed.");
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
  }
  throw new Error("Character preview is taking longer than expected. Try again shortly.");
}
