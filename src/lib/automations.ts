import type { PublicIntegrationStatus } from "./integrations/types";

export type AutomationStatus = "active" | "paused" | "draft" | "needs_connection";
export type AutomationSocialDestination = "tiktok" | "instagram" | "youtube";
export type AutomationDestination = "manual" | AutomationSocialDestination;

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

export const AUTOMATION_SOCIAL_DESTINATIONS = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube Shorts" },
] as const satisfies readonly {
  id: AutomationSocialDestination;
  label: string;
}[];

export function isAutomationSocialDestination(
  destination: AutomationDestination
): destination is AutomationSocialDestination {
  return destination !== "manual";
}

export function automationDestinationLabel(destination: AutomationDestination) {
  if (destination === "manual") return "Review queue";
  return (
    AUTOMATION_SOCIAL_DESTINATIONS.find((candidate) => candidate.id === destination)
      ?.label ?? destination
  );
}

function compactHookTopic(prompt: string) {
  const firstThought = prompt
    .trim()
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)[0]
    ?.replace(/[.!?]+$/g, "")
    .replace(
      /^(?:write|create|open|start|lead|focus|show|explain|share|tell|use)\s+(?:with\s+)?/i,
      ""
    )
    .trim();
  if (!firstThought) return "";
  return firstThought.split(" ").slice(0, 9).join(" ");
}

function lowercaseLead(value: string) {
  return value.length > 0 ? `${value[0].toLowerCase()}${value.slice(1)}` : value;
}

function uppercaseLead(value: string) {
  return value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

/**
 * Compose a deterministic hook locally from the editor's two explicit inputs.
 * This is prompt composition, not an AI or network-backed generation claim.
 */
export function composeAutomationHook(strategy: string, prompt: string) {
  const topic = compactHookTopic(prompt);
  if (!topic) return "";

  switch (strategy) {
    case "Curiosity gap":
      return `What nobody tells you about ${lowercaseLead(topic)}`;
    case "Unexpected result":
      return `${uppercaseLead(topic)} — then this happened`;
    case "Contrarian truth":
      return `The usual advice on ${lowercaseLead(topic)} is wrong`;
    case "Specific transformation":
      return `How ${lowercaseLead(topic)} changed the outcome`;
    case "Concrete promise":
      return `${uppercaseLead(topic)}: the practical steps`;
    default:
      return `${strategy.trim() || "Hook"}: ${topic}`;
  }
}

export type AutomationDestinationReadiness = {
  ready: boolean;
  code:
    | "manual"
    | "ready"
    | "unavailable"
    | "not_configured"
    | "disconnected"
    | "missing_publish"
    | "reauthorization_required"
    | "account_unbound"
    | "account_changed";
  message: string;
  providerStatus: PublicIntegrationStatus | null;
  accountId: string | null;
  accountLabel: string | null;
};

export function integrationAccountLabel(
  account: PublicIntegrationStatus["account"]
) {
  if (!account) return null;
  const username = account.username?.trim() ?? "";
  const displayName = account.displayName?.trim() ?? "";
  const handle = username
    ? username.startsWith("@")
      ? username
      : `@${username}`
    : "";
  if (displayName && handle && displayName !== username) {
    return `${displayName} (${handle})`;
  }
  return displayName || handle || "Connected account";
}

export function resolveAutomationDestination(
  destination: AutomationDestination,
  providers: readonly PublicIntegrationStatus[],
  expectedAccountId?: string | null
): AutomationDestinationReadiness {
  if (destination === "manual") {
    return {
      ready: true,
      code: "manual",
      message: "Review queue only; no social connection is required.",
      providerStatus: null,
      accountId: null,
      accountLabel: null,
    };
  }

  const providerStatus =
    providers.find((candidate) => candidate.provider === destination) ?? null;
  const fallbackName = automationDestinationLabel(destination);
  if (!providerStatus) {
    return {
      ready: false,
      code: "unavailable",
      message: `${fallbackName} connection status is unavailable. The provider handoff remains gated.`,
      providerStatus: null,
      accountId: null,
      accountLabel: null,
    };
  }

  if (providerStatus.configuration !== "ready") {
    return {
      ready: false,
      code: "not_configured",
      message: `${providerStatus.displayName} is not configured for this workspace.`,
      providerStatus,
      accountId: null,
      accountLabel: null,
    };
  }

  if (!providerStatus.connected || !providerStatus.account) {
    return {
      ready: false,
      code: "disconnected",
      message: `${providerStatus.displayName} is configured but no account is connected.`,
      providerStatus,
      accountId: null,
      accountLabel: null,
    };
  }

  if (providerStatus.authorization.status !== "healthy") {
    return {
      ready: false,
      code: "reauthorization_required",
      message:
        providerStatus.authorization.status === "reauthorization_required"
          ? `${providerStatus.displayName} authorization is no longer valid. Reconnect the account before using this plan.`
          : `${providerStatus.displayName} authorization has not been verified yet. Sync or reconnect the account before using this plan.`,
      providerStatus,
      accountId: providerStatus.account.id,
      accountLabel: integrationAccountLabel(providerStatus.account),
    };
  }

  const accountLabel = integrationAccountLabel(providerStatus.account);
  if (expectedAccountId === null) {
    return {
      ready: false,
      code: "account_unbound",
      message: `${providerStatus.displayName} is connected as ${accountLabel}, but this automation is not bound to that account yet.`,
      providerStatus,
      accountId: providerStatus.account.id,
      accountLabel,
    };
  }
  if (
    expectedAccountId !== undefined &&
    expectedAccountId !== providerStatus.account.id
  ) {
    return {
      ready: false,
      code: "account_changed",
      message: `${providerStatus.displayName} is now connected as ${accountLabel}. Review and explicitly rebind this automation before activation.`,
      providerStatus,
      accountId: providerStatus.account.id,
      accountLabel,
    };
  }
  if (!providerStatus.capabilities.publish) {
    return {
      ready: false,
      code: "missing_publish",
      message:
        providerStatus.publishingUnavailableReason ??
        `${providerStatus.displayName} is connected as ${accountLabel}, but the upload scope is not granted.`,
      providerStatus,
      accountId: providerStatus.account.id,
      accountLabel,
    };
  }

  return {
    ready: true,
    code: "ready",
    message: `${providerStatus.displayName} is connected as ${accountLabel} with the required upload scope. This plan can be saved for review.`,
    providerStatus,
    accountId: providerStatus.account.id,
    accountLabel,
  };
}

export function automationStatusAfterReview(
  destination: AutomationDestination,
  providers: readonly PublicIntegrationStatus[],
  options: {
    approvalRequired?: boolean;
    accountId?: string | null;
  } = {}
): AutomationStatus {
  if (destination === "manual") return "paused";
  if (options.approvalRequired === false) return "draft";
  const readiness = Object.prototype.hasOwnProperty.call(options, "accountId")
    ? resolveAutomationDestination(destination, providers, options.accountId)
    : resolveAutomationDestination(destination, providers);
  // Saving a plan never opts it into execution. The local review-draft
  // scheduler can be activated separately; provider publishing remains gated.
  return readiness.ready ? "paused" : "needs_connection";
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
