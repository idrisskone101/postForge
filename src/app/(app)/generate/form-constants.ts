export const CREATIVE_SPARKS = [
  "Candid UGC",
  "Natural window light",
  "Crisp product detail",
  "Handheld framing",
  "Soft focus",
  "Cinematic lighting",
];

export const RATIO_LABELS: Record<string, string> = {
  "9:16": "Portrait",
  "4:5": "Social",
  "1:1": "Square",
  "4:3": "Classic",
  "3:2": "Photo",
  "16:9": "Landscape",
};

export const PROMPT_MAX_LENGTH = 1500;

/** Shared by the form and its skeleton so data arriving never shifts the columns. */
export const GENERATE_LAYOUT = {
  root: "flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start",
  controls: "flex min-w-0 flex-1 flex-col gap-3",
  aside:
    "xl:h-[calc(100dvh-100px)] xl:min-h-[420px] xl:w-[380px] xl:shrink-0",
} as const;
