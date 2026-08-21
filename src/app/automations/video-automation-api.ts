import type { SlideshowAutomation } from "@/components/slideshow/types";
import {
  createAutomationSchedulerState,
  isAutomationRecord,
  type AutomationRecord,
} from "@/lib/automations";
import { fetchIntegrations } from "@/lib/integrations-client";
import type { PublicIntegrationStatus } from "@/lib/integrations/types";
import { fetchSlideshowAutomations } from "@/lib/slideshow/client";
import {
  fetchWorkspaceFeature,
  removeWorkspaceFeature,
  saveWorkspaceFeature,
} from "@/lib/workspace-features-client";
import type { PublishPreflight } from "./hub-types";
import {
  buildPublishRequestBody,
  type PublishMutationResponse,
  type PublishDialogState,
} from "./publish-dialog-model";

export type AutomationsPageSnapshot = {
  records: AutomationRecord[];
  recordsError: string | null;
  providers: PublicIntegrationStatus[];
  providersError: string | null;
  slideshow: SlideshowAutomation[];
  slideshowError: string | null;
};

function readError(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

export async function loadAutomationsPageSnapshot(): Promise<AutomationsPageSnapshot> {
  const [automationsResult, integrationsResult, slideshowResult] =
    await Promise.allSettled([
      fetchWorkspaceFeature<AutomationRecord>("automations"),
      fetchIntegrations(),
      fetchSlideshowAutomations(),
    ]);

  const snapshot: AutomationsPageSnapshot = {
    records: [],
    recordsError: null,
    providers: [],
    providersError: null,
    slideshow: [],
    slideshowError: null,
  };

  if (automationsResult.status === "fulfilled") {
    snapshot.records = automationsResult.value.records.filter(isAutomationRecord);
  } else {
    snapshot.recordsError = readError(
      automationsResult.reason,
      "Unable to load automations"
    );
  }

  if (slideshowResult.status === "fulfilled") {
    snapshot.slideshow = slideshowResult.value;
  } else {
    snapshot.slideshowError = readError(
      slideshowResult.reason,
      "Unable to load slideshow automations"
    );
  }

  if (integrationsResult.status === "fulfilled") {
    snapshot.providers = integrationsResult.value.providers;
  } else {
    snapshot.providersError = readError(
      integrationsResult.reason,
      "Unable to check social connections"
    );
  }

  return snapshot;
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function duplicateAutomationRecord(record: AutomationRecord) {
  const now = new Date().toISOString();
  const duplicateRecord: AutomationRecord = {
    ...record,
    id: `automation_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: `${record.name} copy`,
    status: "draft",
    executionEnabled: false,
    scheduler: createAutomationSchedulerState(),
    publication: undefined,
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
  };
  const response = await saveWorkspaceFeature("automations", duplicateRecord);
  return response.records.filter(isAutomationRecord);
}

export async function postLocalSchedule(
  recordId: string,
  action: "activate" | "pause"
) {
  const response = await fetch(
    `/api/automations/${encodeURIComponent(recordId)}/schedule`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    }
  );
  const body = await readJson<{
    error?: string;
    records?: AutomationRecord[];
  }>(response);
  if (!response.ok || !body.records) {
    throw new Error(body.error || "Unable to update the local schedule");
  }
  return body.records.filter(isAutomationRecord);
}

export async function deleteAutomationRecord(recordId: string) {
  const response = await removeWorkspaceFeature<AutomationRecord>(
    "automations",
    recordId
  );
  return response.records.filter(isAutomationRecord);
}

export async function postReviewDraft(record: { id: string }) {
  const response = await fetch(
    `/api/automations/${encodeURIComponent(record.id)}/run`,
    { method: "POST", headers: { Accept: "application/json" } }
  );
  const body = await readJson<{
    id?: string;
    error?: string;
    automation?: AutomationRecord | null;
  }>(response);
  if (!response.ok || !body.id) {
    throw new Error(body.error || "Unable to submit the review draft");
  }
  return { ...body, id: body.id };
}

export async function requestPublishPreflight(recordId: string, assetId: string) {
  const response = await fetch(
    `/api/automations/${encodeURIComponent(recordId)}/publish`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "preflight", assetId }),
    }
  );
  const body = await readJson<PublishPreflight & { error?: string }>(response);
  if (!response.ok || !body.provider || !body.asset || !body.account) {
    throw new Error(body.error || "Unable to prepare the provider review");
  }
  return body;
}

export async function postPublishAttempt(state: PublishDialogState) {
  const response = await fetch(
    `/api/automations/${encodeURIComponent(state.recordId)}/publish`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPublishRequestBody(state)),
    }
  );
  const body = await readJson<PublishMutationResponse>(response);
  return { ok: response.ok, body };
}

async function postPublishAction(
  recordId: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(
    `/api/automations/${encodeURIComponent(recordId)}/publish`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  const body = await readJson<PublishMutationResponse>(response);
  return { ok: response.ok, body };
}

export async function postPublishRecover(recordId: string) {
  return postPublishAction(recordId, { action: "recover" });
}

export async function postPublishResolve(
  recordId: string,
  resolution: "published" | "not_published"
) {
  return postPublishAction(recordId, {
    action: "resolve",
    resolution,
    consent: true,
  });
}

export async function postPublishStatus(recordId: string) {
  return postPublishAction(recordId, { action: "status" });
}
