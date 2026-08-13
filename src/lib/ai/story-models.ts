/** Default story-generation model id (Ollama Cloud). */
export const DEFAULT_MODEL = "deepseek-v4-flash:0731";

export interface StoryModel {
  /** Stable picker id used across the UI and API. */
  id: string;
  /** Human-friendly name shown in the picker. */
  name: string;
  /** The exact model id sent to Ollama Cloud. */
  ollamaId: string;
  /** Short description shown in the picker. */
  description: string;
  /** Whether the model accepts image inputs (reference analysis). */
  vision?: boolean;
}

/**
 * Story-generation (LLM) models available for writing slideshow copy.
 * These run through Ollama Cloud, the same provider PostForge uses for
 * story generation. Add or remove entries to control what appears in the
 * model picker.
 */
export const STORY_MODELS: StoryModel[] = [
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    ollamaId: "deepseek-v4-flash:0731",
    description: "Fast, default story writer.",
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    ollamaId: "deepseek-v4-pro",
    description: "Higher quality, slower reasoning.",
  },
  {
    id: "glm-5.2",
    name: "GLM 5.2",
    ollamaId: "glm-5.2",
    description: "Strong multilingual copywriting.",
  },
  {
    id: "kimi-k3",
    name: "Kimi K3",
    ollamaId: "kimi-k3",
    description: "Long-form, detail-rich storytelling.",
  },
  {
    id: "qwen3.5",
    name: "Qwen 3.5 397B",
    ollamaId: "qwen3.5:397b",
    description: "Large model, premium output.",
  },
  {
    id: "gpt-oss-120b",
    name: "GPT-OSS 120B",
    ollamaId: "gpt-oss:120b",
    description: "Balanced quality and speed.",
  },
  {
    id: "gemma4",
    name: "Gemma 4",
    ollamaId: "gemma4",
    description: "Lightweight multimodal generalist.",
    vision: true,
  },
];

const STORY_MODEL_BY_ID = new Map(STORY_MODELS.map((m) => [m.id, m]));

export function getStoryModel(pickerId: string | null | undefined): StoryModel | undefined {
  return pickerId ? STORY_MODEL_BY_ID.get(pickerId) : undefined;
}

export function storyModelSupportsVision(pickerId: string | null | undefined): boolean {
  return getStoryModel(pickerId)?.vision === true;
}

/** First vision-capable model in the catalog; used for reference-image analysis
 *  when the workspace's chosen intelligence model cannot accept image inputs. */
export function getDefaultVisionStoryModel(): StoryModel | undefined {
  return STORY_MODELS.find((model) => model.vision === true);
}

/** Resolve a picker id to its Ollama model id, falling back to the default. */
export function resolveStoryModelOllamaId(pickerId: string | null | undefined): string {
  const selected = pickerId ? STORY_MODEL_BY_ID.get(pickerId) : undefined;
  return selected?.ollamaId ?? DEFAULT_MODEL;
}

export function getStoryModelName(pickerId: string | null | undefined): string {
  const selected = pickerId ? STORY_MODEL_BY_ID.get(pickerId) : undefined;
  return selected?.name ?? "DeepSeek V4 Flash";
}

export function getStoryModelIdForOllamaId(ollamaId: string): string | undefined {
  return STORY_MODELS.find((m) => m.ollamaId === ollamaId)?.id;
}
