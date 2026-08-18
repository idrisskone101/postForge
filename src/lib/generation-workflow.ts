export type GenerateIdentityPackSummary = {
  id: string;
  avatarId: string;
  status: "queued" | "processing" | "completed" | "failed";
  error: string | null;
  images: { id: string }[];
};

export function generationErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallback;
}

export function describeGenerateIdentityStatus(
  pack: GenerateIdentityPackSummary | null,
): {
  label: string;
  tone: "ready" | "working" | "failed";
} {
  if (!pack) {
    return {
      label: "No prepared identity pack yet. The original avatar image will be used.",
      tone: "ready",
    };
  }

  if (pack.status === "completed") {
    return {
      label: `${pack.images.length} identity reference${pack.images.length === 1 ? " is" : "s are"} ready.`,
      tone: "ready",
    };
  }

  if (pack.status === "failed") {
    return {
      label:
        pack.error
          ? `Identity preparation failed: ${pack.error}`
          : "Identity preparation failed. The original avatar image will be used.",
      tone: "failed",
    };
  }

  return {
    label: "Preparing identity references. The original avatar is usable now.",
    tone: "working",
  };
}
