const MIN_SLIDES = 1;
const MAX_SLIDES = 20;
const OLLAMA_CHAT_URL = "https://ollama.com/v1/chat/completions";

import { getDefaultIntelligenceModel } from "./model-availability";

export type SlideshowStoryRole = "hook" | "body" | "cta";

export type SlideshowStoryInput = {
  idea: string;
  slideCount?: number;
  language?: string;
  tone?: string;
  audience?: string;
  includeCta?: boolean;
};

export type SlideshowStorySlide = {
  role: SlideshowStoryRole;
  heading: string;
  body: string;
  imagePrompt: string;
};

export type GeneratedSlideshowStory = {
  title: string;
  caption: string;
  slides: SlideshowStorySlide[];
  provider: "ollama" | "local-fallback";
  model: string | null;
  warning?: string;
};

type StoryPayload = Omit<GeneratedSlideshowStory, "provider" | "model" | "warning">;

function normalizedInput(input: SlideshowStoryInput) {
  const idea = input.idea.trim();
  if (!idea) {
    throw new Error("An idea is required to generate a slideshow.");
  }

  return {
    idea,
    slideCount: Math.min(
      MAX_SLIDES,
      Math.max(MIN_SLIDES, Math.round(input.slideCount ?? 7)),
    ),
    language: input.language?.trim() || "English",
    tone: input.tone?.trim() || "specific, conversational, and grounded",
    audience: input.audience?.trim() || "curious social-media viewers",
    includeCta: input.includeCta ?? true,
  };
}

function text(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value.trim().slice(0, maxLength);
}

function expectedRole(index: number, total: number, includeCta: boolean) {
  if (index === 0) return "hook" as const;
  if (includeCta && total > 1 && index === total - 1) return "cta" as const;
  return "body" as const;
}

function validatePayload(
  payload: unknown,
  input: ReturnType<typeof normalizedInput>,
): StoryPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Ollama returned an invalid slideshow payload.");
  }

  const candidate = payload as Partial<StoryPayload>;
  if (!Array.isArray(candidate.slides) || candidate.slides.length !== input.slideCount) {
    throw new Error(
      `Ollama returned ${candidate.slides?.length ?? 0} slides; ${input.slideCount} were requested.`,
    );
  }

  const slides = candidate.slides.map((slide, index) => {
    const value = slide && typeof slide === "object" ? slide : ({} as SlideshowStorySlide);
    const role = expectedRole(index, input.slideCount, input.includeCta);
    return {
      role,
      heading: text(value.heading, `Slide ${index + 1}`, 180),
      body: text(value.body, input.idea, 420),
      imagePrompt: text(
        value.imagePrompt,
        `Editorial lifestyle photograph illustrating ${input.idea}, no text, original composition`,
        600,
      ),
    };
  });

  return {
    title: text(candidate.title, input.idea, 140),
    caption: text(
      candidate.caption,
      `${input.idea}\n\nSave this for later.`,
      1_500,
    ),
    slides,
  };
}

function responseSchema(slideCount: number) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string", description: "A concise internal project title." },
      caption: {
        type: "string",
        description: "A ready-to-post social caption with a natural call to action.",
      },
      slides: {
        type: "array",
        minItems: slideCount,
        maxItems: slideCount,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            role: { type: "string", enum: ["hook", "body", "cta"] },
            heading: {
              type: "string",
              description: "The large on-slide message, usually 3 to 12 words.",
            },
            body: {
              type: "string",
              description: "Optional supporting copy, no more than two short sentences.",
            },
            imagePrompt: {
              type: "string",
              description: "An original, text-free visual prompt for an image model.",
            },
          },
          required: ["role", "heading", "body", "imagePrompt"],
        },
      },
    },
    required: ["title", "caption", "slides"],
  };
}

function promptFor(input: ReturnType<typeof normalizedInput>) {
  const finalRole = input.includeCta && input.slideCount > 1 ? "CTA" : "body";
  return [
    `Create exactly ${input.slideCount} slides about: ${input.idea}`,
    `Audience: ${input.audience}`,
    `Language: ${input.language}`,
    `Tone: ${input.tone}`,
    "The first slide must be a tension-led hook that makes a specific promise.",
    `The final slide must be a ${finalRole} slide.`,
    "Every body slide should advance one distinct thought with a concrete detail.",
    "Avoid generic motivation, unverifiable claims, clickbait that the deck does not fulfill, and repeated wording.",
    "Image prompts must request original editorial/lifestyle compositions with no logos, UI, captions, or embedded text.",
  ].join("\n");
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Ollama returned no JSON object.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

async function generateWithOllama(
  input: ReturnType<typeof normalizedInput>,
  modelId?: string,
): Promise<GeneratedSlideshowStory> {
  const { getProviderCredential } = await import("@/lib/providers/credentials");
  const storedKey = await getProviderCredential("ollama");
  const apiKey = storedKey?.trim() ?? process.env.OLLAMA_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Connect Ollama in Settings to generate stories with your intelligence model.");
  }

  const model = modelId?.trim() || (await getDefaultIntelligenceModel()).ollamaId;
  const response = await fetch(OLLAMA_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are PostForge's slideshow story editor. Produce structured, high-retention social carousel copy while preserving factual humility and the user's intended voice. Respond with a single JSON object and nothing else.",
        },
        {
          role: "user",
          content: `${promptFor(input)}\n\nReturn your answer as JSON matching this exact shape:\n${JSON.stringify(
            responseSchema(input.slideCount),
          )}`,
        },
      ],
      temperature: 0.7,
      stream: false,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(`Ollama story generation failed with HTTP ${response.status}.`);
  }

  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error("Ollama returned no text output.");

  const payload = extractJsonObject(content);
  return {
    ...validatePayload(payload, input),
    provider: "ollama",
    model,
  };
}

function stableIndex(value: string, modulo: number) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % modulo;
}

function localFallback(input: ReturnType<typeof normalizedInput>): StoryPayload {
  const hooks = [
    `The part of ${input.idea} nobody warns you about`,
    `I was making ${input.idea} harder than it needed to be`,
    `What finally changed my approach to ${input.idea}`,
    `${input.idea}: the advice I stopped following`,
  ];
  const bridges = [
    "Start with the friction you can actually see.",
    "Make the smallest useful change first.",
    "Remove one decision from the repeatable part.",
    "Keep the signal; cut the noise around it.",
    "Test the version that fits an ordinary day.",
    "Notice what works twice before scaling it.",
  ];
  const hook = hooks[stableIndex(input.idea, hooks.length)];

  const slides: SlideshowStorySlide[] = Array.from(
    { length: input.slideCount },
    (_, index) => {
      const role = expectedRole(index, input.slideCount, input.includeCta);
      if (role === "hook") {
        return {
          role,
          heading: hook,
          body: `A practical ${input.slideCount}-slide breakdown for ${input.audience}.`,
          imagePrompt: `Editorial lifestyle cover image expressing the tension around ${input.idea}; candid, premium, text-free, vertical composition`,
        };
      }
      if (role === "cta") {
        return {
          role,
          heading: "Save the version you can actually repeat",
          body: `Pick one idea from this deck and try it the next time ${input.idea} comes up.`,
          imagePrompt: `Quiet closing editorial image about completing ${input.idea}; generous negative space, warm natural light, text-free`,
        };
      }

      const bridge = bridges[(stableIndex(input.idea, bridges.length) + index - 1) % bridges.length];
      return {
        role,
        heading: bridge,
        body: `Apply this directly to ${input.idea}, then keep the part that makes the next attempt simpler.`,
        imagePrompt: `Original editorial lifestyle photograph illustrating “${bridge}” in the context of ${input.idea}; candid, realistic, no text or logos`,
      };
    },
  );

  return {
    title: input.idea.slice(0, 140),
    caption: `${hook}\n\nA grounded breakdown of ${input.idea}. Save this for the next time you need it.`,
    slides,
  };
}

export async function generateSlideshowStory(
  rawInput: SlideshowStoryInput,
  modelId?: string,
): Promise<GeneratedSlideshowStory> {
  const input = normalizedInput(rawInput);
  try {
    return await generateWithOllama(input, modelId);
  } catch (error) {
    return {
      ...localFallback(input),
      provider: "local-fallback",
      model: null,
      warning:
        error instanceof Error
          ? error.message
          : "Ollama was unavailable; PostForge used its local story fallback.",
    };
  }
}

export const slideshowStoryLimits = {
  minSlides: MIN_SLIDES,
  maxSlides: MAX_SLIDES,
} as const;
