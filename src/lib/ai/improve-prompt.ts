import { getProviderCredential } from "@/lib/providers/credentials";

const DEFAULT_PROMPT_MODEL = "gemini-3.6-flash";
const MAX_PROMPT_LENGTH = 1_500;

export interface ImproveGenerationPromptRequest {
  prompt: string;
  outputType: "image" | "video";
  modelId: string;
  modelName: string;
  aspectRatio: string;
  duration?: number;
  enableAudio?: boolean;
  hasCharacterReference?: boolean;
  hasVisualReference?: boolean;
  isVideoEdit?: boolean;
}

export interface ImproveGenerationPromptResult {
  prompt: string;
  model: string;
}

export interface ImproveGenerationPromptDependencies {
  model: string;
  apiKey: string;
  fetchImpl: typeof fetch;
}

function stripMarkdownFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function parseImprovedPrompt(text: string) {
  let value: unknown;
  try {
    value = JSON.parse(stripMarkdownFence(text));
  } catch {
    throw new Error("Gemini returned an invalid prompt response. Try again.");
  }
  const prompt =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as { prompt?: unknown }).prompt
      : undefined;
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Gemini returned no improved prompt. Try again.");
  }
  const normalized = prompt.replace(/\s+/g, " ").trim();
  if (normalized.length > MAX_PROMPT_LENGTH) {
    throw new Error("Gemini returned a prompt longer than 1,500 characters. Try again.");
  }
  return normalized;
}

export function buildPromptImprovementSystemInstruction(
  request: ImproveGenerationPromptRequest
) {
  const shared = [
    "You are PostForge's generation prompt director.",
    `Rewrite the user's rough ${request.outputType} prompt for ${request.modelName} (${request.modelId}).`,
    "Preserve the user's subject, intent, named people, named products, dialogue, claims, and desired style.",
    "Never invent brand claims, product features, people, dialogue, captions, logos, or facts that were not supplied.",
    "Make the prompt concrete and visually directable without making it verbose or repetitive.",
    "Do not include negative-prompt lists, provider reference tokens, parameter syntax, markdown, commentary, or alternatives.",
    `The result must be no more than ${MAX_PROMPT_LENGTH} characters.`,
    'Return only JSON in the shape {"prompt":"..."}.',
  ];

  if (request.outputType === "video") {
    if (request.isVideoEdit) {
      shared.push(
        "This is an edit to an existing video, not a new text-to-video scene.",
        "State exactly what should change and what must remain unchanged. Preserve the original timing, camera, setting, and composition unless the user explicitly asks to alter them."
      );
    } else {
      shared.push(
        `Design one coherent ${request.duration ?? 5}-second shot in ${request.aspectRatio}.`,
        "Clarify the opening frame, the subject's action over time, camera behavior, environment, lighting, pacing, and the final beat.",
        "Use physically plausible motion and avoid conflicting camera directions, unexplained scene changes, or overloaded action."
      );
    }
    shared.push(
      request.hasCharacterReference
        ? "A saved character identity is attached. Refer naturally to the selected character and preserve their identity; do not describe a replacement person or add provider reference tokens."
        : "No saved character identity is attached. Do not invent a person's appearance beyond what the user supplied.",
      request.hasVisualReference
        ? "A visual seed is attached. Treat its composition and subject as the opening-frame source; describe motion from it without re-describing or replacing its identity."
        : "No visual seed is attached. Make the opening composition explicit enough to generate from text.",
      request.enableAudio
        ? "Native audio is enabled. Clarify only audio, dialogue, or ambience the user already requested; do not invent spoken lines."
        : "Native audio is disabled. Do not add dialogue, narration, music, ambience, or sound effects unless the user already requested them."
    );
  } else {
    shared.push(
      `Compose a single still image in ${request.aspectRatio}.`,
      "Clarify subject placement, framing, camera perspective, environment, lighting, material detail, and visual finish.",
      request.hasCharacterReference
        ? "A saved character identity is attached. Preserve the selected person's identity without adding provider reference tokens."
        : "Do not invent a person's appearance beyond what the user supplied.",
      request.hasVisualReference
        ? "Visual references are attached. Use them as grounded source material without replacing their subject or inventing unsupported attributes."
        : "No visual reference is attached."
    );
  }

  return shared.join("\n");
}

async function defaultDependencies(): Promise<ImproveGenerationPromptDependencies> {
  const storedKey = await getProviderCredential("gemini");
  const apiKey = storedKey?.trim() ?? process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Connect Gemini in Settings before improving prompts. Your original prompt is unchanged."
    );
  }
  return {
    model:
      process.env.GEMINI_PROMPT_MODEL?.trim() ||
      process.env.GEMINI_SLIDESHOW_MODEL?.trim() ||
      DEFAULT_PROMPT_MODEL,
    apiKey,
    fetchImpl: globalThis.fetch,
  };
}

export async function improveGenerationPrompt(
  request: ImproveGenerationPromptRequest,
  dependencies?: ImproveGenerationPromptDependencies
): Promise<ImproveGenerationPromptResult> {
  const originalPrompt = request.prompt.trim();
  if (!originalPrompt) throw new Error("Write a rough prompt before improving it.");
  if (originalPrompt.length > MAX_PROMPT_LENGTH) {
    throw new Error("The prompt must be 1,500 characters or fewer.");
  }

  const resolvedDependencies = dependencies ?? (await defaultDependencies());
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    resolvedDependencies.model
  )}:generateContent`;
  const response = await resolvedDependencies.fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": resolvedDependencies.apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: originalPrompt }],
        },
      ],
      system_instruction: {
        parts: [{ text: buildPromptImprovementSystemInstruction(request) }],
      },
      generationConfig: {
        temperature: 0.45,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(
      `Gemini prompt improvement failed with HTTP ${response.status}. Your original prompt is unchanged.`
    );
  }

  const completion = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = completion.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no improved prompt. Your original prompt is unchanged.");
  }

  return {
    prompt: parseImprovedPrompt(text),
    model: resolvedDependencies.model,
  };
}
