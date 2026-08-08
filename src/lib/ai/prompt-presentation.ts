type JsonRecord = Record<string, unknown>;

const EDITOR_PROMPT_LIMIT = 1_900;
const SUMMARY_LIMIT = 140;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeWhitespace(value: string) {
  return value.replace(/^@\S+\s+/, "").replace(/\s+/g, " ").trim();
}

function truncateAtWord(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const sliced = value.slice(0, maxLength - 1).trimEnd();
  const lastSpace = sliced.lastIndexOf(" ");
  const safe = lastSpace > maxLength * 0.65 ? sliced.slice(0, lastSpace) : sliced;
  return `${safe}…`;
}

function parseStructuredPrompt(prompt: string): JsonRecord | null {
  if (!prompt.trimStart().startsWith("{")) return null;
  try {
    const parsed: unknown = JSON.parse(prompt);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeAestheticBlocks(value: unknown) {
  if (!Array.isArray(value)) return [];
  const blocks: string[] = [];
  let characterRun = "";

  const flushCharacterRun = () => {
    const normalized = normalizeWhitespace(characterRun);
    if (normalized) blocks.push(normalized);
    characterRun = "";
  };

  for (const item of value) {
    if (typeof item !== "string") continue;
    if (item.length <= 2) {
      characterRun += item;
      continue;
    }
    flushCharacterRun();
    const normalized = normalizeWhitespace(item);
    if (normalized) blocks.push(normalized);
  }
  flushCharacterRun();
  return blocks;
}

const REQUIREMENT_LABELS: Record<string, string> = {
  realistic: "realistic",
  matches_overlaid_copy: "match the overlaid copy",
  no_baked_in_text: "no baked-in text",
  no_captions_logos_borders_watermarks: "no captions, logos, borders, or watermarks",
  keep_subject_in_center_safe_area: "keep the subject in the center safe area",
  negative_space_for_copy: "leave negative space for copy",
};

export function summarizeGenerationPrompt(prompt: string, maxLength = SUMMARY_LIMIT) {
  const structured = parseStructuredPrompt(prompt);
  const onSlideText = structured?.on_slide_text;
  if (typeof onSlideText === "string" && normalizeWhitespace(onSlideText)) {
    return truncateAtWord(normalizeWhitespace(onSlideText), maxLength);
  }

  const intent = structured?.intent;
  if (typeof intent === "string" && normalizeWhitespace(intent)) {
    return truncateAtWord(normalizeWhitespace(intent), maxLength);
  }

  const cleaned = normalizeWhitespace(prompt);
  return truncateAtWord(cleaned, maxLength);
}

export function formatGenerationPromptForEditing(prompt: string) {
  const structured = parseStructuredPrompt(prompt);
  if (!structured) {
    return truncateAtWord(normalizeWhitespace(prompt), EDITOR_PROMPT_LIMIT);
  }

  const lines: string[] = [];
  if (typeof structured.intent === "string") {
    lines.push(normalizeWhitespace(structured.intent));
  }
  if (typeof structured.on_slide_text === "string") {
    lines.push(`Scene direction for: ${normalizeWhitespace(structured.on_slide_text)}`);
  }
  if (typeof structured.aspect_ratio === "string") {
    lines.push(`Aspect ratio: ${normalizeWhitespace(structured.aspect_ratio)}`);
  }
  lines.push(...normalizeAestheticBlocks(structured.aesthetic));

  if (isRecord(structured.image_requirements)) {
    const requirements = Object.entries(structured.image_requirements)
      .filter(([, enabled]) => enabled === true)
      .map(([key]) => REQUIREMENT_LABELS[key] ?? key.replaceAll("_", " "));
    if (requirements.length) lines.push(`Requirements: ${requirements.join("; ")}.`);
  }

  const formatted = lines.filter(Boolean).join("\n");
  return truncateAtWord(formatted || normalizeWhitespace(prompt), EDITOR_PROMPT_LIMIT);
}

export function humanizeGenerationFailure(error: string | null | undefined, fallback: string) {
  const cleaned = normalizeWhitespace(error ?? "");
  if (!cleaned) return fallback;

  if (
    /valid dictionary|extract fields|validation error|pydantic|traceback|stack trace/i.test(
      cleaned,
    )
  ) {
    return "The image provider rejected this request format. Review the generation inputs, then try again.";
  }

  return truncateAtWord(cleaned, 280);
}
