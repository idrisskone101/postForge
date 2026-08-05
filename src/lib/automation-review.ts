import type { ImageGenerationRequest } from "./ai/types";
import type { AutomationRecord } from "./automations";
import { getDefaultModel } from "@/lib/ai/model-availability";

const REVIEW_ASPECT_RATIO = "4:5";

export class AutomationReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutomationReviewValidationError";
  }
}

function requiredPromptText(value: string, label: string, maximum: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    throw new AutomationReviewValidationError(`${label} is required`);
  }
  if (normalized.length > maximum) {
    throw new AutomationReviewValidationError(
      `${label} must be ${maximum} characters or fewer`
    );
  }
  return normalized;
}

export type AutomationReviewDraftSpec = {
  request: ImageGenerationRequest;
  jobInput: Record<string, unknown>;
  jobTags: string[];
};

// Synchronous validation of the review-draft settings. Used by the schedule
// route before activating an automation; the async builder below shares it.
export function validateAutomationReviewDraftSpec(
  automation: AutomationRecord
): void {
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(automation.id)) {
    throw new AutomationReviewValidationError("Automation id is invalid");
  }
  requiredPromptText(automation.name, "Automation name", 120);
  requiredPromptText(automation.hook.selected, "Selected hook", 300);
  requiredPromptText(automation.content.structure, "Content structure", 300);
  requiredPromptText(automation.content.guidance, "Content guidance", 1_000);
  requiredPromptText(automation.cta.style, "CTA style", 160);
  requiredPromptText(automation.cta.prompt, "CTA guidance", 500);
  if (
    !Number.isInteger(automation.content.slideCount) ||
    automation.content.slideCount < 3 ||
    automation.content.slideCount > 10
  ) {
    throw new AutomationReviewValidationError(
      "Slide count must be between 3 and 10"
    );
  }
}

export async function buildAutomationReviewDraftSpec(
  automation: AutomationRecord,
  options: {
    scheduleSlot?: {
      key: string;
      date: string;
      time: string;
      timezone: string;
    };
  } = {}
): Promise<AutomationReviewDraftSpec> {
  validateAutomationReviewDraftSpec(automation);
  const name = requiredPromptText(automation.name, "Automation name", 120);
  const hook = requiredPromptText(
    automation.hook.selected,
    "Selected hook",
    300
  );
  const structure = requiredPromptText(
    automation.content.structure,
    "Content structure",
    300
  );
  const guidance = requiredPromptText(
    automation.content.guidance,
    "Content guidance",
    1_000
  );
  const ctaStyle = requiredPromptText(automation.cta.style, "CTA style", 160);
  const ctaPrompt = requiredPromptText(
    automation.cta.prompt,
    "CTA guidance",
    500
  );

  const prompt = [
    "Create one polished 4:5 social post cover image for human review.",
    `Plan name: ${name}.`,
    `Render this hook exactly once as the only prominent text: \"${hook}\".`,
    `Narrative structure for the planned ${automation.content.slideCount}-slide post: ${structure}.`,
    `Creative guidance: ${guidance}.`,
    `Closing direction for the eventual post: ${ctaStyle}. ${ctaPrompt}.`,
    "Use an editorial, production-ready composition with clear hierarchy, generous spacing, natural texture, and high legibility on a phone.",
    "This is a review draft only. Do not add platform logos, publish controls, engagement counters, watermarks, or extra copy.",
  ].join("\n");

  const reviewModel = await getDefaultModel("image");

  const request: ImageGenerationRequest = {
    prompt,
    model: reviewModel,
    aspectRatio: REVIEW_ASPECT_RATIO,
    numImages: 1,
    negativePrompt:
      "platform logos, social media chrome, publish confirmation, engagement counters, watermarks, duplicate text, illegible typography",
    thinkingLevel: "high",
  };

  const provenance: Record<string, unknown> = {
    source: "automation-review",
    automationId: automation.id,
    automationName: name,
    template: automation.template,
    destination: automation.destination,
    approvalRequired: automation.approvalRequired,
    hook,
    structure,
    guidance,
    ctaStyle,
    ctaPrompt,
    slideCount: automation.content.slideCount,
    collectionId: automation.content.collectionId,
    sourceFileId: automation.content.sourceFileId ?? null,
  };
  if (options.scheduleSlot) {
    provenance.scheduleSlot = options.scheduleSlot;
  }

  return {
    request,
    jobTags: ["automation-review"],
    jobInput: {
      prompt,
      model: reviewModel,
      aspectRatio: REVIEW_ASPECT_RATIO,
      numImages: 1,
      negativePrompt: request.negativePrompt,
      thinkingLevel: request.thinkingLevel,
      provenance,
    },
  };
}

export async function runAutomationReviewDraft(
  automation: AutomationRecord,
  dependencies: {
    generate: (
      request: ImageGenerationRequest,
      options: { jobInput: Record<string, unknown>; jobTags: string[] }
    ) => Promise<string>;
    markAccepted: (
      automationId: string,
      acceptedAt: string,
      jobId: string
    ) => Promise<AutomationRecord | null>;
    now?: () => Date;
  }
) {
  const spec = await buildAutomationReviewDraftSpec(automation);
  const jobId = await dependencies.generate(spec.request, {
    jobInput: spec.jobInput,
    jobTags: spec.jobTags,
  });
  if (!jobId.trim()) {
    throw new Error("Image generation did not return a job id");
  }

  const acceptedAt = (dependencies.now ?? (() => new Date()))().toISOString();
  const updatedAutomation = await dependencies.markAccepted(
    automation.id,
    acceptedAt,
    jobId
  );
  return { jobId, acceptedAt, automation: updatedAutomation };
}
