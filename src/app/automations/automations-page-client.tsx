"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CircleAlert,
  Copy,
  Edit3,
  ExternalLink,
  Inbox,
  Layers,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  WandSparkles,
  Workflow,
  X,
} from "lucide-react";
import { SocialProviderIcon } from "@/components/social-provider-icon";
import { VisualTile } from "@/components/slideshow/slide-preview";
import {
  deleteSlideshowAutomation,
  fetchSlideshowAutomations,
  updateSlideshowAutomationStatus,
} from "@/components/slideshow/api";
import type { SlideshowAutomation } from "@/components/slideshow/types";
import {
  automationDestinationLabel,
  createAutomationSchedulerState,
  isAutomationExecutionEnabled,
  isAutomationRecord,
  isAutomationSocialDestination,
  publicationIsUnresolved,
  resolveAutomationDestination,
  type AutomationPublication,
  type AutomationRecord,
} from "@/lib/automations";
import type {
  TikTokCreatorPublishingInfo,
  TikTokPrivacyLevel,
} from "@/lib/integrations/publishing";
import { fetchIntegrations } from "@/lib/integrations-client";
import type { PublicIntegrationStatus } from "@/lib/integrations/types";
import {
  fetchWorkspaceFeature,
  removeWorkspaceFeature,
  saveWorkspaceFeature,
} from "@/lib/workspace-features-client";
import { cn } from "@/lib/utils";
import { unicodeCodePointLength } from "@/lib/unicode";

const FILTERS = ["All", "Ready plans", "Drafts", "Needs attention"] as const;

type PublishPreflight = {
  provider: "tiktok" | "instagram" | "youtube";
  account: {
    id: string;
    username: string | null;
    displayName: string | null;
  };
  asset: {
    id: string;
    filename: string;
    mimeType: string;
    width: number | null;
    height: number | null;
    durationSec: number | null;
    previewUrl: string;
  };
  caption: string;
  youtube: { title: string; description: string } | null;
  visibility: "private" | "public";
  creator: TikTokCreatorPublishingInfo | null;
  tiktokDirectPostApprovalAcknowledged: boolean;
};

type PublishDialogState = {
  recordId: string;
  recordName: string;
  retryFailed: boolean;
  preflight: PublishPreflight;
  caption: string;
  tiktokPrivacy: "" | TikTokPrivacyLevel;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  commercial: boolean;
  brandContent: boolean;
  brandOrganic: boolean;
  musicUsageConfirmed: boolean;
  brandedPolicyConfirmed: boolean;
  youtubeTitle: string;
  youtubeDescription: string;
  youtubePrivacy: "" | "private" | "unlisted" | "public";
  youtubeAudience: "" | "made_for_kids" | "not_made_for_kids";
  youtubeGuidelinesConfirmed: boolean;
  consent: boolean;
  error: string | null;
};

type ManualResolutionDialogState = {
  record: AutomationRecord;
  resolution: "published" | "not_published";
  error: string | null;
};

function statusLabel(record: AutomationRecord) {
  if (record.status === "active") {
    return isAutomationExecutionEnabled(record)
      ? "Local schedule active"
      : "Local schedule off";
  }
  return record.status === "paused"
    ? "Local schedule paused"
    : record.status === "needs_connection"
    ? "Needs connection"
    : record.status[0].toUpperCase() + record.status.slice(1);
}

export function AutomationsPageClient() {
  const router = useRouter();
  const [records, setRecords] = useState<AutomationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [menu, setMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [integrationStatuses, setIntegrationStatuses] = useState<
    PublicIntegrationStatus[]
  >([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [publishDialog, setPublishDialog] = useState<PublishDialogState | null>(null);
  const [manualResolutionDialog, setManualResolutionDialog] =
    useState<ManualResolutionDialogState | null>(null);
  const [slideshowAutomations, setSlideshowAutomations] = useState<
    SlideshowAutomation[]
  >([]);
  const [slideshowError, setSlideshowError] = useState<string | null>(null);
  const [slideshowDeleteId, setSlideshowDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setIntegrationsLoading(true);
    setError(null);
    setIntegrationsError(null);
    setSlideshowError(null);
    const [automationsResult, integrationsResult, slideshowResult] =
      await Promise.allSettled([
        fetchWorkspaceFeature<AutomationRecord>("automations"),
        fetchIntegrations(),
        fetchSlideshowAutomations(),
      ]);

    if (automationsResult.status === "fulfilled") {
      setRecords(automationsResult.value.records.filter(isAutomationRecord));
    } else {
      setError(
        automationsResult.reason instanceof Error
          ? automationsResult.reason.message
          : "Unable to load automations"
      );
    }

    if (slideshowResult.status === "fulfilled") {
      setSlideshowAutomations(slideshowResult.value);
    } else {
      setSlideshowError(
        slideshowResult.reason instanceof Error
          ? slideshowResult.reason.message
          : "Unable to load slideshow automations"
      );
    }

    if (integrationsResult.status === "fulfilled") {
      setIntegrationStatuses(integrationsResult.value.providers);
    } else {
      setIntegrationStatuses([]);
      setIntegrationsError(
        integrationsResult.reason instanceof Error
          ? integrationsResult.reason.message
          : "Unable to check social connections"
      );
    }
    setLoading(false);
    setIntegrationsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => records.filter((record) => {
    if (filter === "All") return true;
    if (filter === "Ready plans") {
      return (
        (record.status === "active" || record.status === "paused") &&
        !automationNeedsAttention(record, integrationStatuses, integrationsLoading)
      );
    }
    if (filter === "Drafts") return record.status === "draft";
    return automationNeedsAttention(record, integrationStatuses, integrationsLoading);
  }), [records, filter, integrationStatuses, integrationsLoading]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1700);
  }

  async function toggleSlideshow(automation: SlideshowAutomation) {
    const status = automation.status === "active" ? "paused" : "active";
    setBusy(automation.id);
    setSlideshowAutomations((current) =>
      current.map((item) => (item.id === automation.id ? { ...item, status } : item)),
    );
    try {
      const saved = await updateSlideshowAutomationStatus(automation, status);
      setSlideshowAutomations((current) =>
        current.map((item) => (item.id === automation.id ? saved : item)),
      );
      notify(status === "active" ? `${automation.name} resumed` : `${automation.name} paused`);
    } catch (cause) {
      setSlideshowAutomations((current) =>
        current.map((item) => (item.id === automation.id ? automation : item)),
      );
      setSlideshowError(
        cause instanceof Error ? cause.message : "Could not update automation"
      );
    } finally {
      setBusy(null);
    }
  }

  async function removeSlideshow(automation: SlideshowAutomation) {
    setBusy(automation.id);
    setSlideshowDeleteId(null);
    try {
      await deleteSlideshowAutomation(automation);
      setSlideshowAutomations((current) =>
        current.filter((item) => item.id !== automation.id),
      );
      notify(`${automation.name} deleted. Existing drafts are kept.`);
    } catch (cause) {
      setSlideshowError(
        cause instanceof Error ? cause.message : "Could not delete automation"
      );
    } finally {
      setBusy(null);
    }
  }

  async function duplicate(record: AutomationRecord) {
    const now = new Date().toISOString();
    setBusy(record.id);
    setMenu(null);
    try {
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
      const response = await saveWorkspaceFeature(
        "automations",
        duplicateRecord
      );
      setRecords(response.records.filter(isAutomationRecord));
      notify("Automation duplicated as an inactive draft");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to duplicate automation"
      );
    } finally {
      setBusy(null);
    }
  }

  async function changeLocalSchedule(
    record: AutomationRecord,
    action: "activate" | "pause"
  ) {
    setBusy(record.id);
    setMenu(null);
    setError(null);
    try {
      const response = await fetch(
        `/api/automations/${encodeURIComponent(record.id)}/schedule`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );
      const body = (await response.json()) as {
        error?: string;
        records?: AutomationRecord[];
      };
      if (!response.ok || !body.records) {
        throw new Error(body.error || "Unable to update the local schedule");
      }
      setRecords(body.records.filter(isAutomationRecord));
      notify(
        action === "activate"
          ? "Local review-draft schedule activated"
          : "Local review-draft schedule paused"
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to update the local schedule"
      );
    } finally {
      setBusy(null);
    }
  }

  async function remove(record: AutomationRecord) {
    if (!window.confirm(`Delete ${record.name}? Existing generated media will stay in Gallery.`)) return;
    setBusy(record.id);
    try {
      const response = await removeWorkspaceFeature<AutomationRecord>("automations", record.id);
      setRecords(response.records.filter(isAutomationRecord));
      notify("Automation deleted");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete automation");
    } finally {
      setBusy(null);
      setMenu(null);
    }
  }

  async function generateReviewDraft(record: AutomationRecord) {
    setBusy(record.id);
    setMenu(null);
    setError(null);
    try {
      const response = await fetch(
        `/api/automations/${encodeURIComponent(record.id)}/run`,
        { method: "POST", headers: { Accept: "application/json" } }
      );
      const body = (await response.json()) as {
        id?: string;
        error?: string;
        automation?: AutomationRecord | null;
      };
      if (!response.ok || !body.id) {
        throw new Error(body.error || "Unable to submit the review draft");
      }
      if (body.automation && isAutomationRecord(body.automation)) {
        setRecords((current) =>
          current.map((candidate) =>
            candidate.id === body.automation?.id
              ? body.automation as AutomationRecord
              : candidate
          )
        );
      }
      router.push(`/generate/${encodeURIComponent(body.id)}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to submit the review draft"
      );
      setBusy(null);
    }
  }

  function replacePublication(
    recordId: string,
    publication: AutomationPublication | null | undefined
  ) {
    if (!publication) return;
    setRecords((current) =>
      current.map((candidate) =>
        candidate.id === recordId ? { ...candidate, publication } : candidate
      )
    );
  }

  async function openPublishReview(record: AutomationRecord) {
    const assetId = record.content.sourceFileId;
    if (!assetId) {
      setError("Choose and approve a generated Gallery video before publishing");
      return;
    }
    setBusy(record.id);
    setMenu(null);
    setError(null);
    try {
      const response = await fetch(
        `/api/automations/${encodeURIComponent(record.id)}/publish`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "preflight", assetId }),
        }
      );
      const body = (await response.json()) as PublishPreflight & {
        error?: string;
      };
      if (!response.ok || !body.provider || !body.asset || !body.account) {
        throw new Error(body.error || "Unable to prepare the provider review");
      }
      setPublishDialog({
        recordId: record.id,
        recordName: record.name,
        retryFailed: record.publication?.status === "failed",
        preflight: body,
        caption: body.caption,
        tiktokPrivacy: "",
        allowComment: false,
        allowDuet: false,
        allowStitch: false,
        commercial: false,
        brandContent: false,
        brandOrganic: false,
        musicUsageConfirmed: false,
        brandedPolicyConfirmed: false,
        youtubeTitle: body.youtube?.title ?? "",
        youtubeDescription: body.youtube?.description ?? "",
        youtubePrivacy: "",
        youtubeAudience: "",
        youtubeGuidelinesConfirmed: false,
        consent: false,
        error: null,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to prepare the provider review"
      );
    } finally {
      setBusy(null);
    }
  }

  async function submitPublication() {
    if (!publishDialog) return;
    const state = publishDialog;
    setPublishDialog({ ...state, error: null });
    setBusy(state.recordId);
    setError(null);
    try {
      const response = await fetch(
        `/api/automations/${encodeURIComponent(state.recordId)}/publish`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "publish",
            assetId: state.preflight.asset.id,
            caption: state.caption,
            consent: state.consent,
            retryFailed: state.retryFailed,
            musicUsageConfirmed: state.musicUsageConfirmed,
            brandedPolicyConfirmed: state.brandedPolicyConfirmed,
            tiktok:
              state.preflight.provider === "tiktok"
                ? {
                    privacyLevel: state.tiktokPrivacy,
                    allowComment: state.allowComment,
                    allowDuet: state.allowDuet,
                    allowStitch: state.allowStitch,
                    brandContent: state.commercial && state.brandContent,
                    brandOrganic: state.commercial && state.brandOrganic,
                  }
                : undefined,
            youtube:
              state.preflight.provider === "youtube"
                ? {
                    title: state.youtubeTitle,
                    description: state.youtubeDescription,
                    privacyStatus: state.youtubePrivacy,
                    selfDeclaredMadeForKids:
                      state.youtubeAudience === "made_for_kids",
                    audienceConfirmed: Boolean(state.youtubeAudience),
                    communityGuidelinesConfirmed:
                      state.youtubeGuidelinesConfirmed,
                  }
                : undefined,
          }),
        }
      );
      const body = (await response.json()) as {
        error?: string;
        publication?: AutomationPublication | null;
      };
      replacePublication(state.recordId, body.publication);
      if (!response.ok || !body.publication) {
        setPublishDialog((current) =>
          current && current.recordId === state.recordId
            ? {
                ...current,
                retryFailed: body.publication?.status === "failed",
                consent: false,
                error:
                  body.error || "The provider did not accept the publication",
              }
            : current
        );
        return;
      }
      setPublishDialog(null);
      notify(
        body.publication.status === "published"
          ? "Provider confirmed the post is published"
          : "Provider accepted the video; processing status is saved"
      );
    } catch (cause) {
      setPublishDialog((current) =>
        current && current.recordId === state.recordId
          ? {
              ...current,
              error:
                cause instanceof Error
                  ? cause.message
                  : "The provider did not accept the publication",
            }
          : current
      );
    } finally {
      setBusy(null);
    }
  }

  async function recoverPendingPublication(record: AutomationRecord) {
    setBusy(record.id);
    setMenu(null);
    setError(null);
    try {
      const response = await fetch(
        `/api/automations/${encodeURIComponent(record.id)}/publish`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "recover" }),
        }
      );
      const body = (await response.json()) as {
        error?: string;
        publication?: AutomationPublication | null;
      };
      replacePublication(record.id, body.publication);
      if (!response.ok || !body.publication) {
        throw new Error(body.error || "Unable to recover the interrupted attempt");
      }
      notify("Interrupted pre-provider attempt is ready for explicit review");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to recover the interrupted attempt"
      );
    } finally {
      setBusy(null);
    }
  }

  async function resolveUnknownPublication(
    record: AutomationRecord,
    resolution: "published" | "not_published"
  ) {
    setManualResolutionDialog((current) =>
      current ? { ...current, error: null } : current
    );
    setBusy(record.id);
    setMenu(null);
    setError(null);
    try {
      const response = await fetch(
        `/api/automations/${encodeURIComponent(record.id)}/publish`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "resolve",
            resolution,
            consent: true,
          }),
        }
      );
      const body = (await response.json()) as {
        error?: string;
        publication?: AutomationPublication | null;
      };
      replacePublication(record.id, body.publication);
      if (!response.ok || !body.publication) {
        throw new Error(body.error || "Unable to save the verified outcome");
      }
      notify(
        resolution === "published"
          ? "Manual provider verification saved as published"
          : "Manual verification saved; explicit retry is unlocked"
      );
      setManualResolutionDialog(null);
    } catch (cause) {
      setManualResolutionDialog((current) =>
        current
          ? {
              ...current,
              error:
                cause instanceof Error
                  ? cause.message
                  : "Unable to save the verified outcome",
            }
          : current
      );
    } finally {
      setBusy(null);
    }
  }

  async function refreshPublication(record: AutomationRecord) {
    setBusy(record.id);
    setMenu(null);
    setError(null);
    try {
      const response = await fetch(
        `/api/automations/${encodeURIComponent(record.id)}/publish`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "status" }),
        }
      );
      const body = (await response.json()) as {
        error?: string;
        publication?: AutomationPublication | null;
      };
      replacePublication(record.id, body.publication);
      if (!response.ok || !body.publication) {
        throw new Error(body.error || "Unable to refresh provider status");
      }
      notify(
        body.publication.status === "published"
          ? "Provider confirmed the post is published"
          : body.publication.status === "failed"
            ? "Provider reported that processing failed"
            : "Provider status refreshed"
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to refresh provider status"
      );
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="grid min-h-[520px] place-items-center"><Loader2 className="size-6 animate-spin text-[var(--pf-orange)]" /></div>;

  const readyPlanCount = records.filter(
    (record) =>
      (record.status === "active" || record.status === "paused") &&
      !automationNeedsAttention(record, integrationStatuses, integrationsLoading)
  ).length;
  const attentionCount = records.filter((record) =>
    automationNeedsAttention(record, integrationStatuses, integrationsLoading)
  ).length;
  const activeScheduleCount = records.filter(
    (record) =>
      record.status === "active" && isAutomationExecutionEnabled(record)
  ).length;
  const scheduledDays = new Set(records.flatMap((record) => record.schedule.days)).size;
  const weekDates = currentWeekDates();
  const todayKey = localDateKey(new Date());

  return (
    <div className="px-5 py-5 sm:px-7 lg:px-8">
      {error && <div role="alert" className="mb-4 grid min-w-0 grid-cols-[28px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] text-[var(--pf-danger)] sm:grid-cols-[28px_minmax(0,1fr)_auto]"><CircleAlert className="size-4 shrink-0" /><span className="min-w-0 break-words [overflow-wrap:anywhere]">{error}</span><button onClick={load} className="pf-button-secondary col-span-2 shrink-0 !min-h-8 sm:col-span-1"><RefreshCw className="size-3 shrink-0" /> Retry</button></div>}
      {integrationsError && <div role="alert" className="mb-4 grid min-w-0 grid-cols-[28px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-[var(--pf-lamp-amber)]/40 bg-[var(--pf-lamp-amber)]/10 px-3 py-2 text-[11px] text-[var(--pf-lamp-amber)] sm:grid-cols-[28px_minmax(0,1fr)_auto]"><CircleAlert className="size-4 shrink-0" /><span className="min-w-0 break-words [overflow-wrap:anywhere]"><b className="block text-[11px]">Live social connection status is unavailable</b><small className="mt-0.5 block min-w-0 break-words text-[12px] [overflow-wrap:anywhere]">{integrationsError}. Social automations remain visibly gated; no connection is assumed.</small></span><button onClick={load} className="pf-button-secondary col-span-2 shrink-0 !min-h-8 sm:col-span-1"><RefreshCw className="size-3 shrink-0" /> Check again</button></div>}
      {records.length === 0 ? <section className="pf-card pf-empty-stage flex min-h-[650px] min-w-0 flex-col items-center justify-center p-6 text-center"><div className="relative h-36 w-full min-w-0 max-w-72"><span className="absolute left-7 right-7 top-16 h-0.5 bg-[var(--pf-border)]" /><span className="absolute left-5 top-8 grid size-[58px] place-items-center rounded-lg border border-border bg-card text-[11px] font-bold text-[var(--pf-orange)] shadow-md min-[380px]:size-[66px]">HOOK</span><span className="absolute left-1/2 top-8 grid size-[58px] -translate-x-1/2 place-items-center rounded-lg border border-border bg-card text-[11px] font-bold text-[var(--pf-link)] shadow-md min-[380px]:size-[66px]">POST</span><span className="absolute right-5 top-8 grid size-[58px] place-items-center rounded-lg border border-border bg-card text-[var(--pf-success)] shadow-md min-[380px]:size-[66px]"><Check className="size-4 shrink-0" /></span></div><h2 className="mt-2 text-[20px] font-semibold tracking-[-0.02em]">Build your first reviewed content plan</h2><p className="mt-2 max-w-[440px] text-[12px] leading-5 text-muted-foreground">Choose a playbook and save a schedule. Manual plans can create local review drafts; connected social plans can publish an approved Gallery video only after a separate review and explicit confirmation.</p><Link href="/automations/new" className="pf-button-primary mt-5"><Plus className="size-3.5 shrink-0" /> Create a content plan</Link><div className="mt-7 flex flex-col gap-2 text-left text-[11px] text-muted-foreground sm:flex-row sm:gap-6"><span><i className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-[var(--pf-active)] not-italic">1</i>Pick a playbook</span><span><i className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-[var(--pf-active)] not-italic">2</i>Choose a destination</span><span><i className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-[var(--pf-active)] not-italic">3</i>Save approval rules</span></div></section> : <>
        <section className="grid grid-cols-2 gap-2 xl:grid-cols-4"><Metric label="Ready plans" value={String(readyPlanCount)} detail={`${activeScheduleCount} local schedule${activeScheduleCount === 1 ? "" : "s"} active`} tone="success" /><Metric label="Saved workflows" value={String(records.length)} detail={`${records.filter((record) => record.status === "draft").length} drafts`} /><Metric label="Planned days" value={String(scheduledDays)} detail="Across the current week" /><Metric label="Requires attention" value={String(attentionCount)} detail={attentionCount ? "Review schedule or connection" : "Everything is configured"} tone={attentionCount ? "danger" : "success"} /></section>
        <section className="pf-card mt-3 p-4"><div className="flex items-start justify-between"><div><h2 className="pf-section-title mt-1">Planning calendar</h2></div><span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--pf-active)] px-2.5 py-1 text-[12px] text-muted-foreground"><CalendarDays className="size-3" /> Local review schedule</span></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{DAYS.map((day, index) => { const matching = records.filter((record) => record.schedule.days.includes(day)); const date = weekDates[index]; const isToday = localDateKey(date) === todayKey; return <div key={day} className={cn("min-h-[96px] min-w-0 rounded-lg border border-border bg-white p-2",isToday && "bg-[var(--sidebar-accent)]")}><b className="block truncate text-[12px] uppercase text-muted-foreground">{day}</b><span title={date.toLocaleDateString()} className={cn("mt-1 grid size-5 place-items-center rounded-full text-[11px]",isToday && "bg-[var(--pf-orange)] text-white")}>{date.getDate()}</span><div className="mt-2 space-y-1">{matching.slice(0, 2).map((record) => <span key={record.id} className={cn("block truncate rounded-md border-l border-border px-1.5 py-1 text-[11px]",automationNeedsAttention(record, integrationStatuses, integrationsLoading) ? "border-border bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]" : isAutomationExecutionEnabled(record) && record.status === "active" ? "border-border bg-[var(--pf-success)]/10 text-[var(--pf-success)]" : "border-border bg-[var(--pf-active)] text-muted-foreground")}>{record.schedule.time} · {record.name}</span>)}</div></div>; })}</div></section>
        <section className="pf-card mt-3 overflow-visible p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h2 className="pf-section-title mt-1">Your automations</h2><p className="mt-1 max-w-[560px] min-w-0 break-words text-[12px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">Manual Review queue plans can generate real image drafts on their saved local schedule after you activate them. Social plans never auto-publish: each approved Gallery video requires a separate provider review and explicit confirmation.</p></div><div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-[var(--pf-active)] p-1">{FILTERS.map((item) => <button key={item} onClick={() => setFilter(item)} className={cn("h-7 whitespace-nowrap rounded-lg px-2 text-[12px] text-muted-foreground",filter === item && "bg-white font-semibold text-foreground shadow-sm")}>{item}{item === "Needs attention" && attentionCount > 0 && <span className="ml-1 rounded-full bg-[var(--pf-orange)] px-1.5 py-0.5 text-[11px] text-white">{attentionCount}</span>}</button>)}</div></div>
          <div className="mt-4 hidden grid-cols-[1.5fr_1fr_1fr_.8fr_28px] gap-3 px-2 text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground md:grid"><span>Automation</span><span>Destination</span><span>Cadence</span><span>Status</span><span /></div>
          {filtered.length === 0 ? (
            <div className="py-14 text-center">
              <Workflow className="mx-auto size-7 text-muted-foreground" />
              <h3 className="mt-2 text-[13px] font-semibold">
                No automations in this filter
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Try All or create another workflow.
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((record) => {
                const needsAttention = automationNeedsAttention(
                  record,
                  integrationStatuses,
                  integrationsLoading
                );
                const scheduleActive =
                  record.status === "active" &&
                  isAutomationExecutionEnabled(record);
                const canControlLocalSchedule =
                  record.destination === "manual" || scheduleActive;
                const pendingRecoverable =
                  record.publication?.status === "pending" &&
                  Date.now() - new Date(record.publication.requestedAt).getTime() >=
                    300_000;
                const canRefreshPublication =
                  record.publication?.status === "submitted" &&
                  Boolean(record.publication.accountId) &&
                  (record.publication.provider === "youtube" ||
                    Boolean(record.publication.externalId)) &&
                  record.publication.providerStatus !== "PUBLISH_REQUEST_SENT" &&
                  record.publication.providerStatus !== "PUBLISH_OUTCOME_UNKNOWN";
                const publicationAgeMs =
                  Date.now() -
                  new Date(record.publication?.requestedAt ?? 0).getTime();
                const explicitUnknownStage =
                  (record.publication?.status === "submitted" ||
                    (record.publication?.status === "failed" &&
                      record.publication.providerStatus ===
                        "LOCAL_RETENTION_OUTCOME_UNKNOWN")) &&
                  record.publication.providerStatus?.endsWith(
                    "OUTCOME_UNKNOWN"
                  );
                const requestBoundaryStage =
                  record.publication?.status === "submitted" &&
                  (record.publication.providerStatus === "INIT_REQUEST_SENT" ||
                    record.publication.providerStatus === "PUBLISH_REQUEST_SENT" ||
                    record.publication.providerStatus === "UPLOAD_REQUEST_SENT");
                const reconciliationStages = new Set([
                  "INITIALIZED",
                  "CONTAINER_CREATED",
                  "READY_TO_PUBLISH",
                  "UPLOAD_SESSION_CREATED",
                  "UPLOADED_PROCESSING",
                  "PROCESSING_UPLOAD",
                  "PROCESSING_DOWNLOAD",
                  "SEND_TO_USER_INBOX",
                ]);
                const failedReconciliationStage =
                  record.publication?.status === "submitted" &&
                  Boolean(record.publication.error) &&
                  (reconciliationStages.has(
                    record.publication.providerStatus ?? ""
                  ) ||
                    record.publication.providerStatus?.includes(
                      "PROCESSING"
                    ) === true);
                const manualOutcomeStage =
                  explicitUnknownStage ||
                  requestBoundaryStage ||
                  failedReconciliationStage;
                const providerSettlingWindowMs =
                  record.publication?.provider === "tiktok"
                    ? 6 * 60 * 60 * 1000
                    : 60 * 60 * 1000;
                const manualOutcomeResolvable =
                  manualOutcomeStage &&
                  (explicitUnknownStage ||
                    (requestBoundaryStage && publicationAgeMs >= 1_800_000) ||
                    (failedReconciliationStage &&
                      publicationAgeMs >= providerSettlingWindowMs));
                const negativeOutcomeResolvable =
                  manualOutcomeStage &&
                  publicationAgeMs >= providerSettlingWindowMs;
                return (
                  <article
                    key={record.id}
                    className="relative grid min-w-0 gap-3 border-t border-border px-2 py-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,.8fr)_28px] md:items-center"
                  >
                    <div className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)] items-center gap-2">
                      <span className="grid h-12 w-10 place-items-center rounded-lg bg-[var(--pf-orange)] text-white">
                        <Workflow className="size-4 shrink-0" />
                      </span>
                      <span className="min-w-0">
                        <b className="block truncate text-[11px]">{record.name}</b>
                        <small className="mt-1 block truncate text-[12px] text-muted-foreground">
                          {record.content.slideCount} slides ·{" "}
                          {record.template.replaceAll("-", " ")}
                        </small>
                      </span>
                    </div>
                    <AutomationDestinationCell
                      record={record}
                      providers={integrationStatuses}
                      loading={integrationsLoading}
                    />
                    <div className="min-w-0 break-words text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                      <span>
                        {record.schedule.days.join(", ")} · {record.schedule.time}
                      </span>
                      <small className="mt-1 block text-[11px] text-muted-foreground">
                        {record.schedule.timezone}
                      </small>
                      {record.lastRunAt && (
                        <small className="mt-1 block text-[11px] text-muted-foreground">
                          Draft queued {new Date(record.lastRunAt).toLocaleDateString()}
                        </small>
                      )}
                      {record.scheduler?.lastJobId && (
                        <small className="mt-1 block min-w-0 break-words font-mono text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                          Job {record.scheduler.lastJobId}
                        </small>
                      )}
                      {record.scheduler?.lastError && (
                        <small
                          role="alert"
                          className="mt-1 block min-w-0 break-words text-[11px] leading-3 text-[var(--pf-danger)] [overflow-wrap:anywhere]"
                        >
                          {record.scheduler.lastError}
                        </small>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span
                        className={cn(
                          "inline-block max-w-full break-words rounded-full px-2 py-1 text-[11px] font-bold [overflow-wrap:anywhere]",
                          needsAttention
                            ? "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
                            : scheduleActive
                              ? "bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
                              : "bg-[var(--pf-active)] text-muted-foreground"
                        )}
                      >
                        {needsAttention ? "Needs attention" : statusLabel(record)}
                      </span>
                      {record.publication && (
                        <PublicationStatus publication={record.publication} />
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setMenu(menu === record.id ? null : record.id)}
                        className="grid size-7 place-items-center rounded-lg hover:bg-[var(--pf-active)]"
                        aria-label={`Actions for ${record.name}`}
                      >
                        <MoreHorizontal className="size-4 shrink-0" />
                      </button>
                      {menu === record.id && (
                        <div className="absolute right-0 top-8 z-30 max-h-[min(70dvh,420px)] w-56 min-w-0 overscroll-contain overflow-y-auto rounded-lg border border-border bg-white p-1.5 text-[11px] shadow-xl">
                          {canControlLocalSchedule ? (
                            <button
                              onClick={() =>
                                changeLocalSchedule(
                                  record,
                                  scheduleActive ? "pause" : "activate"
                                )
                              }
                              className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--pf-active)]"
                            >
                              {scheduleActive ? (
                                <Pause className="size-3 shrink-0" />
                              ) : (
                                <Play className="size-3 shrink-0" />
                              )}
                              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                {scheduleActive
                                  ? "Pause local schedule"
                                  : "Activate local schedule"}
                              </span>
                            </button>
                          ) : (
                            <p className="flex min-w-0 items-start gap-2 px-2 py-2 text-[12px] leading-3 text-muted-foreground">
                              <CircleAlert className="mt-0.5 size-3 shrink-0" />
                              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                Local scheduling is unavailable for social destinations.
                              </span>
                            </p>
                          )}
                          <button
                            onClick={() => generateReviewDraft(record)}
                            className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--pf-active)]"
                          >
                            <WandSparkles className="size-3 shrink-0" />
                            Generate review draft
                          </button>
                          {isAutomationSocialDestination(record.destination) &&
                            record.publication?.status !== "submitted" &&
                            record.publication?.status !== "pending" &&
                            record.publication?.status !== "published" &&
                            record.publication?.providerStatus !==
                              "LOCAL_RETENTION_OUTCOME_UNKNOWN" && (
                              <button
                                onClick={() => openPublishReview(record)}
                                className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--pf-active)]"
                              >
                                <Send className="size-3 shrink-0" />
                                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                  {record.publication?.status === "failed"
                                    ? "Review and retry publish"
                                    : "Publish approved video"}
                                </span>
                              </button>
                            )}
                          {canRefreshPublication && (
                            <button
                              onClick={() => refreshPublication(record)}
                              className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--pf-active)]"
                            >
                              <RefreshCw className="size-3 shrink-0" />
                              Refresh provider status
                            </button>
                          )}
                          {pendingRecoverable && (
                            <button
                              onClick={() => recoverPendingPublication(record)}
                              className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--pf-active)]"
                            >
                              <RefreshCw className="size-3 shrink-0" />
                              Recover interrupted attempt
                            </button>
                          )}
                          {manualOutcomeStage && (
                              <div className="min-w-0 px-2 py-2 text-[12px] leading-3 text-[var(--pf-lamp-amber)]">
                                <p className="flex min-w-0 items-start gap-2">
                                  <CircleAlert className="mt-0.5 size-3 shrink-0" />
                                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                    {failedReconciliationStage
                                      ? "The latest provider reconciliation failed. You can retry this safe status check, but PostForge will not blindly publish again."
                                      : "Provider outcome is unknown. Verify this exact post on the connected account; automatic retry is disabled."}
                                  </span>
                                </p>
                                {manualOutcomeResolvable && (
                                  <div className="mt-2 grid min-w-0 gap-1">
                                    <button
                                      onClick={() =>
                                        setManualResolutionDialog({
                                          record,
                                          resolution: "published",
                                          error: null,
                                        })
                                      }
                                      className="min-h-7 min-w-0 break-words rounded-lg border border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 px-2 text-left font-semibold text-[var(--pf-success)] [overflow-wrap:anywhere]"
                                    >
                                      I verified it published
                                    </button>
                                    {negativeOutcomeResolvable ? (
                                      <button
                                        onClick={() =>
                                        setManualResolutionDialog({
                                          record,
                                          resolution: "not_published",
                                          error: null,
                                        })
                                        }
                                        className="min-h-7 min-w-0 break-words rounded-lg border border-[var(--pf-lamp-amber)]/40 bg-[var(--pf-lamp-amber)]/10 px-2 text-left font-semibold text-[var(--pf-lamp-amber)] [overflow-wrap:anywhere]"
                                      >
                                        I verified it did not publish
                                      </button>
                                    ) : (
                                      <p className="min-w-0 break-words rounded-lg bg-[var(--pf-lamp-amber)]/10 px-2 py-1.5 [overflow-wrap:anywhere]">
                                        Negative resolution stays locked while provider processing or moderation may still be underway ({record.publication?.provider === "tiktok" ? "6 hours" : "1 hour"}).
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          <Link
                            href={`/automations/new?id=${encodeURIComponent(record.id)}`}
                            className="flex min-h-8 min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--pf-active)]"
                          >
                            <Edit3 className="size-3 shrink-0" /> Edit workflow
                          </Link>
                          <button
                            onClick={() => duplicate(record)}
                            className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--pf-active)]"
                          >
                            <Copy className="size-3 shrink-0" /> Duplicate
                          </button>
                          {publicationIsUnresolved(record.publication) ? (
                            <p className="flex min-w-0 items-start gap-2 px-2 py-2 text-[12px] leading-3 text-muted-foreground">
                              <ShieldCheck className="mt-0.5 size-3 shrink-0" />
                              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                Destination, account, approved asset, and deletion stay locked until the provider reaches a final state.
                              </span>
                            </p>
                          ) : (
                            <button
                              onClick={() => remove(record)}
                              className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-[var(--pf-danger)] hover:bg-[var(--pf-danger)]/10"
                            >
                              <Trash2 className="size-3 shrink-0" /> Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {busy === record.id && (
                      <div className="absolute inset-0 grid place-items-center bg-card/80">
                        <Loader2 className="size-4 shrink-0 animate-spin text-[var(--pf-orange)]" />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </>}
      <section className="pf-card mt-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">

            <h2 className="pf-section-title mt-1">Carousel draft schedules</h2>
            <p className="mt-1 max-w-[560px] min-w-0 break-words text-[12px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">
              Scheduled runs generate full slideshow drafts into the Slideshow studio. Nothing publishes automatically; exports stay a manual, reviewed action.
            </p>
          </div>
          <Link href="/automations/new?workflow=slideshow" className="pf-button-primary shrink-0">
            <Plus className="size-3.5 shrink-0" /> New slideshow automation
          </Link>
        </div>
        {slideshowError ? (
          <div role="alert" className="mt-4 flex min-w-0 items-start justify-between gap-3 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] text-[var(--pf-danger)]">
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{slideshowError}</span>
            <button onClick={load} className="pf-button-secondary shrink-0 !min-h-8">
              <RefreshCw className="size-3 shrink-0" /> Retry
            </button>
          </div>
        ) : null}
        {slideshowAutomations.length === 0 && !slideshowError ? (
          <div className="py-10 text-center">
            <Layers className="mx-auto size-7 text-muted-foreground" />
            <h3 className="mt-2 text-[13px] font-semibold">No slideshow schedules yet</h3>
            <p className="mx-auto mt-1 max-w-[400px] text-[11px] leading-4 text-muted-foreground">
              Create drafts on a cadence from a hook pool or an existing slideshow, then review and export them in the studio.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {slideshowAutomations.map((automation) => (
              <div key={automation.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
                <div className="flex min-w-0 items-center gap-3">
                  <VisualTile
                    visualKey={automation.visualKey ?? "coral-glow"}
                    className="size-10 shrink-0 rounded-lg"
                  />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                      <span className="truncate">{automation.name}</span>
                      <span className="shrink-0 rounded-full bg-[var(--pf-orange)]/10 px-1.5 py-px text-[11px] font-bold text-[var(--pf-orange)]">
                        Slideshow
                      </span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <CalendarDays className="size-3" />
                      {automation.cadence}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-[12px] font-medium",
                        automation.visualPolicy === "fresh-ai" ? "text-[var(--pf-lamp-amber)]" : "text-[var(--pf-success)]",
                      )}
                    >
                      {automation.visualPolicy === "fresh-ai"
                        ? "Fresh AI images. $0.08 per slide."
                        : "Reuses saved visuals. No image cost."}
                    </p>
                  </div>
                </div>
                <div className="hidden lg:block">
                  <p className="text-[12px] font-semibold text-muted-foreground">Next run</p>
                  <p className="mt-0.5 text-[11px] font-medium text-foreground">
                    {automation.status === "active"
                      ? automation.nextRunAt
                        ? new Date(automation.nextRunAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "Not scheduled"
                      : "Paused"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[12px] font-bold",
                      automation.status === "active"
                        ? "bg-accent-green/10 text-accent-green"
                        : "bg-[var(--pf-active)] text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        automation.status === "active" ? "bg-accent-green" : "bg-[var(--pf-border-strong)]",
                      )}
                    />
                    {automation.status === "active" ? "Active" : "Paused"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={automation.status === "active"}
                    aria-label={automation.status === "active" ? `Pause ${automation.name}` : `Resume ${automation.name}`}
                    disabled={busy === automation.id}
                    onClick={() => void toggleSlideshow(automation)}
                    className={cn(
                      "relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50",
                      automation.status === "active" ? "bg-[var(--pf-success)]" : "bg-[var(--pf-border-strong)]",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-[3px] size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-all duration-200",
                        automation.status === "active" ? "left-[19px]" : "left-[3px]",
                      )}
                    />
                  </button>
                  <span className="mx-1 h-5 w-px bg-border" />
                  <Link
                    href="/slideshow"
                    aria-label={`Open drafts for ${automation.name}`}
                    title="Drafts land in the Slideshow studio"
                    className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--pf-active)] hover:text-foreground"
                  >
                    <Layers className="size-3.5" />
                  </Link>
                  <Link
                    href={`/automations/new?workflow=slideshow&id=${encodeURIComponent(automation.id)}`}
                    aria-label={`Edit ${automation.name}`}
                    className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--pf-active)] hover:text-foreground"
                  >
                    <Edit3 className="size-3.5" />
                  </Link>
                  {slideshowDeleteId === automation.id ? (
                    <span className="flex items-center gap-1.5 rounded-lg bg-[var(--pf-danger)]/10 px-2 py-1">
                      <span className="text-[12px] font-semibold text-[var(--pf-danger)]">Delete?</span>
                      <button
                        onClick={() => void removeSlideshow(automation)}
                        disabled={busy === automation.id}
                        className="text-[12px] font-bold text-[var(--pf-danger)] underline underline-offset-2 disabled:opacity-50"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setSlideshowDeleteId(null)}
                        className="text-[12px] font-semibold text-muted-foreground"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setSlideshowDeleteId(automation.id)}
                      aria-label={`Delete ${automation.name}`}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)]"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {toast && <div role="status" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[80] flex min-w-0 items-center gap-2 rounded-lg bg-foreground px-3 py-2.5 text-[12px] font-medium text-white shadow-xl sm:left-auto sm:max-w-[420px]"><Check className="size-3.5 shrink-0 text-[var(--pf-success)]" /><span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{toast}</span></div>}
      {publishDialog && (
        <PublishReviewDialog
          state={publishDialog}
          busy={busy === publishDialog.recordId}
          onChange={(next) => setPublishDialog({ ...next, error: null })}
          onClose={() => setPublishDialog(null)}
          onPublish={submitPublication}
        />
      )}
      {manualResolutionDialog && (
        <ManualResolutionDialog
          state={manualResolutionDialog}
          busy={busy === manualResolutionDialog.record.id}
          onClose={() => setManualResolutionDialog(null)}
          onConfirm={() =>
            resolveUnknownPublication(
              manualResolutionDialog.record,
              manualResolutionDialog.resolution
            )
          }
        />
      )}
    </div>
  );
}

function ManualResolutionDialog({
  state,
  busy,
  onClose,
  onConfirm,
}: {
  state: ManualResolutionDialogState;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const published = state.resolution === "published";
  const provider = automationDestinationLabel(state.record.destination);
  return (
    <div
      className="pf-safe-overlay fixed inset-0 z-[100] grid min-w-0 place-items-center overflow-y-auto bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-resolution-title"
    >
      <div className="max-h-full w-full min-w-0 max-w-[470px] overflow-y-auto rounded-[12px] border border-border bg-white p-5 shadow-2xl sm:p-6">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-full",
            published
              ? "bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
              : "bg-[var(--pf-lamp-amber)]/10 text-[var(--pf-lamp-amber)]"
          )}
        >
          {published ? (
            <Check className="size-4" />
          ) : (
            <CircleAlert className="size-4" />
          )}
        </span>

        <h2
          id="manual-resolution-title"
          className="mt-1 min-w-0 break-words text-[20px] font-semibold tracking-[-0.035em] [overflow-wrap:anywhere]"
        >
          {published
            ? `Confirm this exact ${provider} post is live`
            : `Confirm ${provider} did not publish this attempt`}
        </h2>
        <p className="mt-2 min-w-0 break-words text-[11px] leading-5 text-muted-foreground [overflow-wrap:anywhere] dark:text-[var(--pf-muted)]">
          {published
            ? "Only continue after you personally found this exact video on the connected account. PostForge will record your confirmation as the final outcome."
            : "Only continue after checking the connected account after the provider settling window. This unlocks a new explicit review and could duplicate a delayed post if the verification is wrong."}
        </p>
        <div className="mt-3 min-w-0 rounded-lg bg-[var(--pf-active)] p-3 text-[11px] text-muted-foreground dark:bg-[var(--pf-active)] dark:text-[var(--pf-muted)]">
          <b className="block min-w-0 break-words [overflow-wrap:anywhere]">
            {state.record.name}
          </b>
          <span className="mt-1 block min-w-0 break-words [overflow-wrap:anywhere]">
            Account {state.record.accountLabel || state.record.accountId || "unknown"}
          </span>
        </div>
        {state.error && (
          <p
            role="alert"
            className="mt-3 min-w-0 break-words rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 p-3 text-[11px] leading-4 text-[var(--pf-danger)] [overflow-wrap:anywhere]"
          >
            {state.error}
          </p>
        )}
        <div className="mt-5 flex min-w-0 flex-col-reverse gap-2 min-[420px]:flex-row min-[420px]:justify-end pb-[max(0px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="pf-button-secondary justify-center disabled:opacity-45"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-white disabled:opacity-45",
              published ? "bg-[var(--pf-success)]" : "bg-[var(--pf-lamp-amber)]"
            )}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : published ? (
              <Check className="size-3.5" />
            ) : (
              <ShieldCheck className="size-3.5" />
            )}
            {published
              ? "I verified it is published"
              : "I verified it was not published"}
          </button>
        </div>
      </div>
    </div>
  );
}

function publicationVisibilityLabel(publication: AutomationPublication) {
  if (publication.providerVisibility) {
    return publication.providerVisibility.replaceAll("_", " ").toLowerCase();
  }
  return publication.visibility
    ? `${publication.visibility} requested · provider privacy readback unavailable`
    : "provider privacy pending";
}

function PublicationStatus({
  publication,
}: {
  publication: AutomationPublication;
}) {
  const label =
    publication.status === "pending"
      ? "Preparing secure handoff"
      : publication.status === "submitted"
        ? "Provider processing"
        : publication.status === "published"
          ? "Provider published"
          : "Publish failed";
  return (
    <div className="mt-1 min-w-0 text-[11px] leading-3 text-muted-foreground">
      <b
        className={cn(
          "block min-w-0 break-words [overflow-wrap:anywhere]",
          publication.status === "failed"
            ? "text-[var(--pf-danger)]"
            : publication.status === "published"
              ? "text-[var(--pf-success)]"
              : "text-[var(--pf-lamp-amber)]"
        )}
      >
        {label}
      </b>
      {publication.providerStatus && (
        <span className="block min-w-0 break-words [overflow-wrap:anywhere]">
          {publication.providerStatus.replaceAll("_", " ").toLowerCase()} ·{" "}
          {publicationVisibilityLabel(publication)}
        </span>
      )}
      {publication.error && (
        <span
          role="alert"
          className="block min-w-0 break-words text-[var(--pf-danger)] [overflow-wrap:anywhere]"
        >
          {publication.error}
        </span>
      )}
    </div>
  );
}

function PublishReviewDialog({
  state,
  busy,
  onChange,
  onClose,
  onPublish,
}: {
  state: PublishDialogState;
  busy: boolean;
  onChange: (next: PublishDialogState) => void;
  onClose: () => void;
  onPublish: () => void;
}) {
  const providerName =
    state.preflight.provider === "youtube"
      ? "YouTube Shorts"
      : state.preflight.provider === "instagram"
        ? "Instagram Reels"
        : "TikTok";
  const accountName =
    state.preflight.account.displayName ||
    state.preflight.account.username ||
    state.preflight.account.id;
  const descriptionBytes = new TextEncoder().encode(
    state.youtubeDescription
  ).length;
  const tiktokCommercialValid =
    !state.commercial ||
    ((state.brandContent || state.brandOrganic) &&
      (!state.brandContent || state.brandedPolicyConfirmed));
  const tiktokPrivacyValid =
    Boolean(state.tiktokPrivacy) &&
    !(state.brandContent && state.tiktokPrivacy === "SELF_ONLY");
  const youtubeValid =
    Boolean(state.youtubePrivacy) &&
    Boolean(state.youtubeAudience) &&
    state.youtubeGuidelinesConfirmed &&
    Boolean(state.youtubeTitle.trim()) &&
    unicodeCodePointLength(state.youtubeTitle) <= 100 &&
    !/[<>]/.test(state.youtubeTitle) &&
    descriptionBytes <= 5000 &&
    !/[<>]/.test(state.youtubeDescription);
  const canPublish =
    state.consent &&
    (state.preflight.provider === "tiktok"
      ? state.preflight.tiktokDirectPostApprovalAcknowledged &&
        tiktokPrivacyValid &&
        state.musicUsageConfirmed &&
        tiktokCommercialValid
      : state.preflight.provider === "youtube"
        ? youtubeValid
        : state.caption.length <= 2200);
  const creator = state.preflight.creator;

  return (
    <div
      className="pf-safe-overlay fixed inset-0 z-[90] grid min-w-0 place-items-center overflow-y-auto bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-review-title"
    >
      <div className="flex max-h-full w-full min-w-0 max-w-[760px] flex-col overflow-hidden rounded-[12px] border border-border bg-card shadow-2xl sm:rounded-[12px]">
        <header className="flex min-w-0 shrink-0 items-start justify-between gap-3 border-b border-border bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0">

            <h2
              id="publish-review-title"
              className="mt-1 min-w-0 break-words text-[15px] font-semibold tracking-[-0.035em] [overflow-wrap:anywhere]"
            >
              Publish {state.recordName} to {providerName}
            </h2>
            <p className="mt-1 min-w-0 break-words text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
              Connected account: {accountName}
              {state.preflight.account.username
                ? ` (@${state.preflight.account.username.replace(/^@/, "")})`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-[var(--pf-active)] disabled:opacity-40"
            aria-label="Close publishing review"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="grid min-h-0 min-w-0 flex-1 overflow-y-auto md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="min-w-0 border-b border-border bg-[var(--pf-active)] p-4 md:border-b-0 md:border-r">
            <div className="mx-auto w-full max-w-[210px] overflow-hidden rounded-lg bg-black shadow-lg">
              <video
                src={state.preflight.asset.previewUrl}
                controls
                preload="metadata"
                className="aspect-[9/16] max-h-[42dvh] w-full object-contain md:max-h-[390px]"
              />
            </div>
            <p className="mx-auto mt-3 max-w-[210px] min-w-0 break-words text-[12px] leading-4 text-muted-foreground [overflow-wrap:anywhere] dark:text-[var(--pf-muted)]">
              <b className="block text-[11px] text-foreground">
                Approved Gallery output
              </b>
              {state.preflight.asset.filename}
              {state.preflight.asset.width && state.preflight.asset.height
                ? ` · ${state.preflight.asset.width}×${state.preflight.asset.height}`
                : ""}
              {state.preflight.asset.durationSec
                ? ` · ${Math.round(state.preflight.asset.durationSec)}s`
                : ""}
            </p>
          </aside>

          <section className="min-w-0 space-y-4 p-4 sm:p-5">
            {state.error && (
              <div
                role="alert"
                className="flex min-w-0 items-start gap-2 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 p-3 text-[11px] leading-4 text-[var(--pf-danger)]"
              >
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                  {state.error}
                </span>
              </div>
            )}
            {state.preflight.provider === "tiktok" && creator && (
              <>
                <div className="min-w-0 rounded-lg border border-border bg-card p-3 text-[11px] leading-4 text-muted-foreground">
                  <b className="block min-w-0 break-words text-[11px] text-foreground [overflow-wrap:anywhere]">
                    {creator.creatorNickname} · @{creator.creatorUsername}
                  </b>
                  Current TikTok controls were checked live. Maximum video length:{" "}
                  {creator.maximumVideoDurationSec}s. PostForge marks generated media as AI-generated.
                </div>
                <FieldLabel label="Caption" detail={`${state.caption.length}/2200`}>
                  <textarea
                    value={state.caption}
                    maxLength={2200}
                    onChange={(event) =>
                      onChange({ ...state, caption: event.target.value })
                    }
                    className="min-h-24 w-full min-w-0 resize-y rounded-lg border border-border bg-white px-3 py-2 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                  />
                </FieldLabel>
                <FieldLabel label="Who can watch" detail="Choose one; no default is assumed">
                  <select
                    value={state.tiktokPrivacy}
                    onChange={(event) =>
                      onChange({
                        ...state,
                        tiktokPrivacy: event.target.value as
                          | ""
                          | TikTokPrivacyLevel,
                      })
                    }
                    className="h-10 w-full min-w-0 rounded-lg border border-border bg-white px-3 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                  >
                    <option value="">Select TikTok privacy</option>
                    {creator.privacyLevelOptions.map((privacy) => (
                      <option
                        key={privacy}
                        value={privacy}
                        disabled={
                          (state.brandContent && privacy === "SELF_ONLY") ||
                          !state.preflight.tiktokDirectPostApprovalAcknowledged
                        }
                      >
                        {privacy.replaceAll("_", " ").toLowerCase()}
                      </option>
                    ))}
                  </select>
                  {state.brandContent && state.tiktokPrivacy === "SELF_ONLY" && (
                    <p role="alert" className="mt-1 text-[12px] text-[var(--pf-danger)]">
                      Paid partnership posts cannot use Only me. Choose another option.
                    </p>
                  )}
                </FieldLabel>
                <div className="grid min-w-0 gap-2 sm:grid-cols-3">
                  <CheckControl
                    label="Allow comments"
                    checked={state.allowComment}
                    disabled={creator.commentDisabled}
                    onChange={(checked) =>
                      onChange({ ...state, allowComment: checked })
                    }
                  />
                  <CheckControl
                    label="Allow Duet"
                    checked={state.allowDuet}
                    disabled={creator.duetDisabled}
                    onChange={(checked) =>
                      onChange({ ...state, allowDuet: checked })
                    }
                  />
                  <CheckControl
                    label="Allow Stitch"
                    checked={state.allowStitch}
                    disabled={creator.stitchDisabled}
                    onChange={(checked) =>
                      onChange({ ...state, allowStitch: checked })
                    }
                  />
                </div>
                <CheckControl
                  label="This post promotes a brand, product, or service"
                  checked={state.commercial}
                  onChange={(checked) =>
                    onChange({
                      ...state,
                      commercial: checked,
                      brandContent: checked ? state.brandContent : false,
                      brandOrganic: checked ? state.brandOrganic : false,
                      brandedPolicyConfirmed: checked
                        ? state.brandedPolicyConfirmed
                        : false,
                    })
                  }
                />
                {state.commercial && (
                  <div className="min-w-0 space-y-2 rounded-lg border border-[var(--pf-lamp-amber)]/40 bg-[var(--pf-lamp-amber)]/10 p-3">
                    <p className="min-w-0 break-words text-[11px] leading-4 text-[var(--pf-lamp-amber)] [overflow-wrap:anywhere]">
                      Select at least one commercial disclosure. Branded content cannot use Only me privacy.
                    </p>
                    <CheckControl
                      label="Your brand"
                      checked={state.brandOrganic}
                      onChange={(checked) =>
                        onChange({ ...state, brandOrganic: checked })
                      }
                    />
                    <CheckControl
                      label="Branded content / paid partnership"
                      checked={state.brandContent}
                      onChange={(checked) =>
                        onChange({ ...state, brandContent: checked })
                      }
                    />
                    <p className="min-w-0 break-words text-[12px] font-semibold text-[var(--pf-lamp-amber)] [overflow-wrap:anywhere]">
                      TikTok will label this {state.brandContent ? "Paid partnership" : "Promotional content"}.
                    </p>
                    {state.brandContent && (
                      <>
                        <a
                          href="https://www.tiktok.com/legal/page/global/bc-policy/en"
                          target="_blank"
                          rel="noreferrer"
                          className="block min-w-0 break-words text-[12px] font-semibold text-[var(--pf-orange)] underline [overflow-wrap:anywhere] dark:text-[var(--pf-orange)]"
                        >
                          Read TikTok&apos;s Branded Content Policy
                        </a>
                      </>
                    )}
                    {!state.preflight.tiktokDirectPostApprovalAcknowledged &&
                      state.brandContent && (
                        <p role="alert" className="min-w-0 break-words text-[12px] text-[var(--pf-danger)] [overflow-wrap:anywhere]">
                          Live Direct Post is unavailable until TikTok approves this app. Internal or team-only upload tools may not qualify for approval.
                        </p>
                      )}
                  </div>
                )}
                {state.brandContent ? (
                  <CheckControl
                    label="By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation"
                    checked={
                      state.musicUsageConfirmed && state.brandedPolicyConfirmed
                    }
                    onChange={(checked) =>
                      onChange({
                        ...state,
                        musicUsageConfirmed: checked,
                        brandedPolicyConfirmed: checked,
                      })
                    }
                  />
                ) : (
                  <CheckControl
                    label="By posting, you agree to TikTok's Music Usage Confirmation"
                    checked={state.musicUsageConfirmed}
                    onChange={(checked) =>
                      onChange({ ...state, musicUsageConfirmed: checked })
                    }
                  />
                )}
                <a
                  href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
                  target="_blank"
                  rel="noreferrer"
                  className="block min-w-0 break-words text-[12px] font-semibold text-[var(--pf-orange)] underline [overflow-wrap:anywhere] dark:text-[var(--pf-orange)]"
                >
                  Read TikTok&apos;s Music Usage Confirmation
                </a>
                <p className="min-w-0 break-words text-[12px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">
                  {state.preflight.tiktokDirectPostApprovalAcknowledged
                    ? "An operator acknowledged external TikTok Direct Post approval. This setting does not obtain or prove approval; verify it remains current in TikTok's developer portal. TikTok's status API does not return privacy."
                    : "Live TikTok publishing is unavailable until an operator verifies external Direct Post approval in TikTok's developer portal. Internal or team-only upload tools may not qualify. A configuration flag cannot substitute for provider approval."}
                </p>
              </>
            )}

            {state.preflight.provider === "instagram" && (
              <>
                <div className="rounded-lg border border-border bg-card p-3 text-[11px] leading-4 text-muted-foreground">
                  Instagram Reels are public media. Instagram must fetch this approved video from a short-lived signed URL before publishing.
                </div>
                <FieldLabel label="Reel caption" detail={`${state.caption.length}/2200`}>
                  <textarea
                    value={state.caption}
                    maxLength={2200}
                    onChange={(event) =>
                      onChange({ ...state, caption: event.target.value })
                    }
                    className="min-h-28 w-full min-w-0 resize-y rounded-lg border border-border bg-white px-3 py-2 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                  />
                </FieldLabel>
              </>
            )}

            {state.preflight.provider === "youtube" && (
              <>
                <div className="rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 p-3 text-[11px] leading-4 text-[var(--pf-danger)]">
                  This upload includes YouTube&apos;s synthetic-media disclosure. Unverified API projects may force uploads to private; the saved record will show YouTube&apos;s actual privacy response.
                </div>
                <FieldLabel
                  label="Short title"
                  detail={`${unicodeCodePointLength(state.youtubeTitle)}/100`}
                >
                  <input
                    value={state.youtubeTitle}
                    onChange={(event) =>
                      onChange({ ...state, youtubeTitle: event.target.value })
                    }
                    className="h-10 w-full min-w-0 rounded-lg border border-border bg-white px-3 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                  />
                </FieldLabel>
                <FieldLabel
                  label="Description"
                  detail={`${descriptionBytes}/5000 UTF-8 bytes`}
                >
                  <textarea
                    value={state.youtubeDescription}
                    onChange={(event) =>
                      onChange({ ...state, youtubeDescription: event.target.value })
                    }
                    className="min-h-28 w-full min-w-0 resize-y rounded-lg border border-border bg-white px-3 py-2 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                  />
                </FieldLabel>
                <FieldLabel label="Visibility" detail="Choose one; no default is assumed">
                  <select
                    value={state.youtubePrivacy}
                    onChange={(event) =>
                      onChange({
                        ...state,
                        youtubePrivacy: event.target.value as
                          | ""
                          | "private"
                          | "unlisted"
                          | "public",
                      })
                    }
                    className="h-10 w-full min-w-0 rounded-lg border border-border bg-white px-3 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                  >
                    <option value="">Select YouTube visibility</option>
                    <option value="private">Private</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="public">Public</option>
                  </select>
                </FieldLabel>
                <FieldLabel
                  label="Audience"
                  detail="Required by YouTube; no default is assumed"
                >
                  <select
                    value={state.youtubeAudience}
                    onChange={(event) =>
                      onChange({
                        ...state,
                        youtubeAudience: event.target.value as
                          | ""
                          | "made_for_kids"
                          | "not_made_for_kids",
                      })
                    }
                    className="h-10 w-full min-w-0 rounded-lg border border-border bg-white px-3 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                  >
                    <option value="">Select whether this video is made for kids</option>
                    <option value="made_for_kids">Yes, it&apos;s made for kids</option>
                    <option value="not_made_for_kids">No, it&apos;s not made for kids</option>
                  </select>
                </FieldLabel>
                <div className="min-w-0 rounded-lg border border-border bg-white p-3">
                  <CheckControl
                    label="I certify this upload complies with YouTube Community Guidelines"
                    checked={state.youtubeGuidelinesConfirmed}
                    onChange={(checked) =>
                      onChange({
                        ...state,
                        youtubeGuidelinesConfirmed: checked,
                      })
                    }
                  />
                  <a
                    href="https://www.youtube.com/howyoutubeworks/policies/community-guidelines/"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex min-w-0 items-center gap-1 break-words text-[12px] font-semibold text-[var(--pf-orange)] underline [overflow-wrap:anywhere] dark:text-[var(--pf-orange)]"
                  >
                    Review YouTube Community Guidelines
                    <ExternalLink className="size-2.5 shrink-0" />
                  </a>
                  <p className="mt-2 min-w-0 break-words text-[12px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">
                    By uploading, you agree to the{" "}
                    <a
                      href="https://www.youtube.com/t/terms"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[var(--pf-orange)] underline dark:text-[var(--pf-orange)]"
                    >
                      YouTube Terms
                    </a>
                    .
                  </p>
                </div>
              </>
            )}

            <div className="min-w-0 rounded-lg border border-border bg-white p-3">
              <CheckControl
                label={`Publish this exact approved video to ${providerName} now`}
                checked={state.consent}
                onChange={(checked) => onChange({ ...state, consent: checked })}
              />
              <p className="mt-2 min-w-0 break-words text-[12px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">
                This is an external mutation. The scheduler will not repeat it. Provider acceptance, processing, failures, and retry state are persisted to this workflow.
              </p>
            </div>
          </section>
        </div>

        <footer className="flex min-w-0 shrink-0 flex-col-reverse gap-2 border-t border-border bg-white px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="min-w-0 break-words text-[12px] text-muted-foreground [overflow-wrap:anywhere]">
            {state.retryFailed
              ? "This creates a new explicit attempt for the same approved asset."
              : "Nothing is sent until you confirm this review."}
          </p>
          <div className="flex shrink-0 flex-col-reverse gap-2 min-[420px]:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="pf-button-secondary justify-center disabled:opacity-45"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onPublish}
              disabled={busy || !canPublish}
              className="pf-button-primary justify-center disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              {state.retryFailed ? "Retry publish" : "Publish now"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FieldLabel({
  label,
  detail,
  children,
}: {
  label: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex min-w-0 items-start justify-between gap-2 text-[13px] font-semibold">
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">{label}</span>
        <small className="shrink-0 font-normal text-muted-foreground dark:text-[var(--pf-muted)]">{detail}</small>
      </span>
      {children}
    </label>
  );
}

function CheckControl({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-w-0 items-start gap-2 rounded-lg border border-border bg-white px-2.5 py-2 text-[11px] leading-4",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-3.5 shrink-0 accent-[var(--pf-orange)]"
      />
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">
        {label}
        {disabled ? " (disabled by creator settings)" : ""}
      </span>
    </label>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function currentWeekDates(now = new Date()) {
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  monday.setHours(12, 0, 0, 0);
  return DAYS.map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function automationNeedsAttention(
  record: AutomationRecord,
  providers: readonly PublicIntegrationStatus[],
  integrationsLoading: boolean
) {
  if (
    record.publication?.status === "failed" ||
    record.publication?.status === "pending" ||
    (record.publication?.status === "submitted" && record.publication.error)
  ) {
    return true;
  }
  if (record.scheduler?.lastError) return true;
  if (record.status === "needs_connection") return true;
  if (!isAutomationSocialDestination(record.destination) || integrationsLoading) {
    return false;
  }
  if (!record.approvalRequired) return true;
  return !resolveAutomationDestination(
    record.destination,
    providers,
    record.accountId ?? null
  ).ready;
}

function AutomationDestinationCell({
  record,
  providers,
  loading,
}: {
  record: AutomationRecord;
  providers: readonly PublicIntegrationStatus[];
  loading: boolean;
}) {
  if (!isAutomationSocialDestination(record.destination)) {
    return (
      <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
          <Inbox className="size-3.5" />
        </span>
        <span className="min-w-0">
          <b className="block truncate text-[11px]">Review queue</b>
          <small className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            No external account
          </small>
        </span>
      </div>
    );
  }

  const readiness = resolveAutomationDestination(
    record.destination,
    providers,
    record.accountId ?? null
  );
  const providerName =
    readiness.providerStatus?.displayName ??
    automationDestinationLabel(record.destination);
  const accountLabel = readiness.accountLabel ?? record.accountLabel;
  const warningLabel =
    readiness.code === "not_configured"
      ? "Provider not configured"
      : readiness.code === "missing_publish"
        ? "Upload scope missing"
        : readiness.code === "reauthorization_required"
          ? "Reconnect required"
        : readiness.code === "account_unbound"
          ? "Choose the connected account"
          : readiness.code === "account_changed"
            ? "Connected account changed"
        : readiness.code === "disconnected"
          ? "Account disconnected"
          : "Connection status unavailable";

  return (
    <div className="flex min-w-0 items-start gap-2 text-[11px] text-muted-foreground">
      <SocialProviderIcon
        provider={record.destination}
        label={providerName}
        youtubeVariant="shorts"
        className="size-7 shrink-0"
      />
      <span className="min-w-0">
        <b className="block truncate text-[11px]">{providerName}</b>
        <small className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {accountLabel ?? "No connected account"}
        </small>
        {loading ? (
          <small className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 className="size-2.5 animate-spin" /> Checking live connection
          </small>
        ) : readiness.ready ? (
          <small className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--pf-success)]">
            <Check className="size-2.5" /> Connection verified
          </small>
        ) : (
          <small
            className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--pf-danger)]"
            title={readiness.message}
          >
            <CircleAlert className="size-2.5 shrink-0" /> {warningLabel}
          </small>
        )}
      </span>
    </div>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: "success" | "danger" }) {
  return <article className="pf-card p-3"><span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span><div className="mt-2 flex items-center justify-between"><b className={cn("text-[20px] font-semibold tracking-[-0.02em]",tone === "danger" && "text-[var(--pf-danger)]")}>{value}</b>{tone && <i className={cn("size-2 rounded-full",tone === "success" ? "bg-[var(--pf-success)]" : "bg-[var(--pf-danger)]")} />}</div><small className="mt-1 block text-[12px] text-muted-foreground">{detail}</small></article>;
}
