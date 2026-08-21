import {
  isAutomationSocialDestination,
  type AutomationDestination,
  type AutomationSocialDestination,
  type AutomationStatus,
} from "./automations/destination";

export type {
  AutomationDestination,
  AutomationDestinationReadiness,
  AutomationSocialDestination,
  AutomationStatus,
} from "./automations/destination";
export {
  AUTOMATION_SOCIAL_DESTINATIONS,
  automationDestinationLabel,
  automationStatusAfterReview,
  findConnectedAccount,
  integrationAccountLabel,
  isAutomationSocialDestination,
  resolveAutomationDestination,
} from "./automations/destination";
export { composeAutomationHook } from "./automations/hook";

export type AutomationPublicationStatus =
  | "pending"
  | "submitted"
  | "published"
  | "failed";

export type AutomationPublication = {
  attemptId: string;
  attemptNumber: number;
  idempotencyKey: string;
  provider: AutomationSocialDestination;
  assetId: string;
  /** Provider account id; scrubbed to null when provider data expires. */
  accountId: string | null;
  status: AutomationPublicationStatus;
  requestedAt: string;
  updatedAt: string;
  externalId: string | null;
  providerStatus: string | null;
  visibility:
    | "private"
    | "followers"
    | "friends"
    | "unlisted"
    | "public"
    | null;
  /** Exact provider privacy value; null means provider confirmation is pending. */
  providerVisibility: string | null;
  /** Last time YouTube itself returned or reverified provider data. */
  providerDataRefreshedAt?: string | null;
  error: string | null;
  recoveryLeaseId?: string | null;
  recoveryClaimedAt?: string | null;
  manualResolution?: "published" | "not_published" | null;
  manuallyResolvedAt?: string | null;
};

/**
 * One safety predicate owns every destructive and identity-changing lock.
 * Retention can intentionally scrub a possibly-live YouTube outcome into a
 * failed local tombstone; that tombstone is still unresolved until a person
 * records the provider outcome.
 */
export function publicationIsUnresolved(
  publication: AutomationPublication | null | undefined
) {
  return (
    publication?.status === "pending" ||
    publication?.status === "submitted" ||
    (publication?.status === "failed" &&
      publication.providerStatus === "LOCAL_RETENTION_OUTCOME_UNKNOWN" &&
      !publication.manualResolution)
  );
}

export type AutomationRecord = {
  id: string;
  name: string;
  template: string;
  status: AutomationStatus;
  destination: AutomationDestination;
  accountId?: string | null;
  accountLabel: string | null;
  schedule: {
    days: string[];
    time: string;
    timezone: string;
  };
  approvalRequired: boolean;
  hook: {
    strategy: string;
    prompt: string;
    selected: string;
  };
  content: {
    structure: string;
    slideCount: number;
    guidance: string;
    collectionId: string | null;
    sourceFileId: string | null;
  };
  cta: {
    style: string;
    prompt: string;
  };
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  /**
   * Server-owned execution gate. Missing is intentionally equivalent to false
   * so records created before the local scheduler can never begin running.
   */
  executionEnabled?: boolean;
  scheduler?: {
    lastClaimedSlot?: string | null;
    lastClaimedAt?: string | null;
    lastJobId?: string | null;
    lastError?: string | null;
    lastErrorAt?: string | null;
  };
  /**
   * Server-owned latest external publication attempt. The client can display
   * this state, but generic workspace saves must never create or alter it.
   */
  publication?: AutomationPublication;
};

export function createAutomationSchedulerState(): NonNullable<
  AutomationRecord["scheduler"]
> {
  return {
    lastClaimedSlot: null,
    lastClaimedAt: null,
    lastJobId: null,
    lastError: null,
    lastErrorAt: null,
  };
}

export function isAutomationExecutionEnabled(record: AutomationRecord) {
  return record.executionEnabled === true;
}

export const AUTOMATION_TEMPLATES = [
  {
    id: "story-lesson",
    name: "Story lesson",
    category: "Education",
    slides: 6,
    description: "Turn one experience into a clean lesson with a strong hook and useful close.",
    hook: "Curiosity gap",
    structure: "Problem → Shift → Result",
    cta: "Save this post",
  },
  {
    id: "before-after",
    name: "Before / after",
    category: "Transformation",
    slides: 6,
    description: "Build tension with the old way, reveal the change, and land the result.",
    hook: "Unexpected result",
    structure: "Before → Change → After",
    cta: "Follow for part two",
  },
  {
    id: "product-breakdown",
    name: "Product breakdown",
    category: "Product",
    slides: 8,
    description: "Explain what it is, why it matters, and the proof behind the claim.",
    hook: "Specific product truth",
    structure: "Problem → Product → Proof",
    cta: "Visit profile link",
  },
  {
    id: "quick-wins",
    name: "3 quick wins",
    category: "Listicle",
    slides: 5,
    description: "A fast, repeatable format for useful tips viewers want to keep.",
    hook: "Concrete promise",
    structure: "Tip 1 → Tip 2 → Tip 3",
    cta: "Save this post",
  },
  {
    id: "myth-reality",
    name: "Myth vs reality",
    category: "Education",
    slides: 6,
    description: "Challenge a familiar assumption and replace it with a sharper view.",
    hook: "Contrarian truth",
    structure: "Myth → Evidence → Reality",
    cta: "Comment a keyword",
  },
  {
    id: "custom",
    name: "Custom automation",
    category: "Blank",
    slides: 5,
    description: "Start with a blank Hook, Content, and CTA structure.",
    hook: "Curiosity gap",
    structure: "Problem → Shift → Result",
    cta: "Save this post",
  },
] as const;

export function createAutomationRecord(
  templateId = "story-lesson",
  defaults: {
    timezone?: string;
    approvalRequired?: boolean;
    sourceFileId?: string | null;
  } = {}
): AutomationRecord {
  const template =
    AUTOMATION_TEMPLATES.find((candidate) => candidate.id === templateId) ??
    AUTOMATION_TEMPLATES[0];
  const now = new Date().toISOString();
  return {
    id: `automation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: `${template.name} loop`,
    template: template.id,
    status: "draft",
    destination: "manual",
    accountId: null,
    accountLabel: null,
    schedule: {
      days: ["Mon", "Wed", "Fri"],
      time: "09:15",
      timezone: defaults.timezone?.trim() || "America/Toronto",
    },
    approvalRequired: defaults.approvalRequired ?? true,
    hook: {
      strategy: template.hook,
      prompt: "Open with one concrete result or surprising observation. Keep it under 12 words.",
      selected: "The small change I wish I tried sooner",
    },
    content: {
      structure: template.structure,
      slideCount: template.slides,
      guidance: "Each slide should make one concrete point in conversational language.",
      collectionId: null,
      sourceFileId: defaults.sourceFileId?.trim() || null,
    },
    cta: {
      style: template.cta,
      prompt: "End with a low-pressure action that naturally follows the lesson.",
    },
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
    executionEnabled: false,
    scheduler: createAutomationSchedulerState(),
  };
}

export function isAutomationRecord(value: unknown): value is AutomationRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Partial<AutomationRecord>;
  const schedule = record.schedule;
  const hook = record.hook;
  const content = record.content;
  const cta = record.cta;
  const scheduler = record.scheduler;
  const publication = record.publication;

  const isOptionalNullableString = (candidate: unknown) =>
    candidate === undefined || candidate === null || typeof candidate === "string";

  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.template === "string" &&
    (["active", "paused", "draft", "needs_connection"] as const).includes(
      record.status as AutomationStatus
    ) &&
    (["manual", "tiktok", "instagram", "youtube"] as const).includes(
      record.destination as AutomationDestination
    ) &&
    (record.accountId === undefined ||
      record.accountId === null ||
      typeof record.accountId === "string") &&
    (record.accountLabel === null || typeof record.accountLabel === "string") &&
    Boolean(schedule) &&
    Array.isArray(schedule?.days) &&
    schedule.days.every((day) => typeof day === "string") &&
    typeof schedule.time === "string" &&
    typeof schedule.timezone === "string" &&
    typeof record.approvalRequired === "boolean" &&
    hook !== undefined &&
    hook !== null &&
    typeof hook.strategy === "string" &&
    typeof hook.prompt === "string" &&
    typeof hook.selected === "string" &&
    content !== undefined &&
    content !== null &&
    typeof content.structure === "string" &&
    typeof content.slideCount === "number" &&
    Number.isFinite(content.slideCount) &&
    typeof content.guidance === "string" &&
    (content.collectionId === null || typeof content.collectionId === "string") &&
    (content.sourceFileId === undefined ||
      content.sourceFileId === null ||
      typeof content.sourceFileId === "string") &&
    cta !== undefined &&
    cta !== null &&
    typeof cta.style === "string" &&
    typeof cta.prompt === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    (record.lastRunAt === null || typeof record.lastRunAt === "string") &&
    (record.executionEnabled === undefined ||
      typeof record.executionEnabled === "boolean") &&
    (scheduler === undefined ||
      (scheduler !== null &&
        typeof scheduler === "object" &&
        isOptionalNullableString(scheduler.lastClaimedSlot) &&
        isOptionalNullableString(scheduler.lastClaimedAt) &&
        isOptionalNullableString(scheduler.lastJobId) &&
        isOptionalNullableString(scheduler.lastError) &&
        isOptionalNullableString(scheduler.lastErrorAt))) &&
    (publication === undefined ||
      (publication !== null &&
        typeof publication === "object" &&
        typeof publication.attemptId === "string" &&
        Number.isSafeInteger(publication.attemptNumber) &&
        publication.attemptNumber > 0 &&
        typeof publication.idempotencyKey === "string" &&
        isAutomationSocialDestination(publication.provider) &&
        typeof publication.assetId === "string" &&
        (publication.accountId === null ||
          typeof publication.accountId === "string") &&
        (["pending", "submitted", "published", "failed"] as const).includes(
          publication.status
        ) &&
        typeof publication.requestedAt === "string" &&
        typeof publication.updatedAt === "string" &&
        isOptionalNullableString(publication.externalId) &&
        isOptionalNullableString(publication.providerStatus) &&
        (publication.visibility === null ||
          publication.visibility === "private" ||
          publication.visibility === "followers" ||
          publication.visibility === "friends" ||
          publication.visibility === "unlisted" ||
          publication.visibility === "public") &&
        isOptionalNullableString(publication.providerVisibility) &&
        isOptionalNullableString(publication.providerDataRefreshedAt) &&
        isOptionalNullableString(publication.error) &&
        isOptionalNullableString(publication.recoveryLeaseId) &&
        isOptionalNullableString(publication.recoveryClaimedAt) &&
        (publication.manualResolution === undefined ||
          publication.manualResolution === null ||
          publication.manualResolution === "published" ||
          publication.manualResolution === "not_published") &&
        isOptionalNullableString(publication.manuallyResolvedAt)))
  );
}
