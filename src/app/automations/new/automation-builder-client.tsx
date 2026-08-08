"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Grid2X2,
  Heart,
  ImageIcon,
  Inbox,
  LayoutTemplate,
  List,
  Loader2,
  Minus,
  Plus,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { SocialProviderIcon } from "@/components/social-provider-icon";
import { VideoFramePreview } from "@/components/video-frame-preview";
import {
  AUTOMATION_SOCIAL_DESTINATIONS,
  AUTOMATION_TEMPLATES,
  automationDestinationLabel,
  automationStatusAfterReview,
  composeAutomationHook,
  createAutomationRecord,
  integrationAccountLabel,
  isAutomationRecord,
  isAutomationSocialDestination,
  resolveAutomationDestination,
  type AutomationDestination,
  type AutomationRecord,
} from "@/lib/automations";
import { fetchIntegrations } from "@/lib/integrations-client";
import type { PublicIntegrationStatus } from "@/lib/integrations/types";
import {
  isCollectionAssetRecord,
  isCollectionRecord,
  type CollectionAssetRecord,
  type CollectionRecord,
  type CollectionFeatureRecord,
} from "@/lib/collections";
import {
  fetchWorkspaceFeature,
  saveWorkspaceFeature,
} from "@/lib/workspace-features-client";
import { cn } from "@/lib/utils";

type Phase = "Hook" | "Content" | "CTA";
type TemplateSort = "recommended" | "name" | "slides";
type TemplateView = "grid" | "list";
type AutomationTemplate = (typeof AUTOMATION_TEMPLATES)[number];
export type AutomationSourceFile = {
  id: string;
  filename: string;
  type: string;
  mimeType: string;
  previewUrl: string;
};

export type AutomationPreviewAsset = {
  id: string;
  name: string;
  kind: "image" | "video";
  previewUrl: string;
  origin: "Attached generated asset" | "Visual collection";
};

type WorkspaceSettingsDefaults = {
  id: string;
  timezone: string;
  approvalDefault: boolean;
};

const PHASES: Phase[] = ["Hook", "Content", "CTA"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FAVORITES_STORAGE_KEY = "postforge.automation-playbook-favorites";
export const PREVIEW_ZOOM_MIN = 40;
export const PREVIEW_ZOOM_MAX = 100;
export const PREVIEW_ZOOM_STEP = 6;

const TEMPLATE_VISUALS: Record<string, string> = {
  "story-lesson": "bg-[linear-gradient(145deg,#FFC2AD,#FF5B33)]",
  "before-after": "bg-[linear-gradient(145deg,#C6DFFF,#4B86CB)]",
  "product-breakdown": "bg-[linear-gradient(145deg,#C7EAD5,#3D8960)]",
  "quick-wins": "bg-[linear-gradient(145deg,#E0D3FF,#8B67C7)]",
  "myth-reality": "bg-[linear-gradient(145deg,#F5E3AE,#CC9C37)]",
  custom: "bg-[#E5E6DF]",
};

export function clampPreviewZoom(value: number) {
  return Math.max(PREVIEW_ZOOM_MIN, Math.min(PREVIEW_ZOOM_MAX, value));
}

export function selectAutomationPreviewAsset({
  sourceFileId,
  sourceFile,
  collectionId,
  collections,
  collectionAssets,
}: {
  sourceFileId: string | null;
  sourceFile: AutomationSourceFile | null;
  collectionId: string | null;
  collections: readonly CollectionRecord[];
  collectionAssets: readonly CollectionAssetRecord[];
}): AutomationPreviewAsset | null {
  if (sourceFileId) {
    if (!sourceFile || sourceFile.id !== sourceFileId) return null;
    return {
      id: sourceFile.id,
      name: sourceFile.filename,
      kind:
        sourceFile.type === "video" || sourceFile.mimeType.startsWith("video/")
          ? "video"
          : "image",
      previewUrl: sourceFile.previewUrl,
      origin: "Attached generated asset",
    };
  }

  if (!collectionId) return null;
  const collection = collections.find((candidate) => candidate.id === collectionId);
  const assetsById = new Map(
    collectionAssets.map((candidate) => [candidate.id, candidate])
  );
  const asset = collection?.assetIds
    .map((assetId) => assetsById.get(assetId))
    .find((candidate): candidate is CollectionAssetRecord => Boolean(candidate));
  if (!asset) return null;

  return {
    id: asset.id,
    name: asset.name || asset.filename,
    kind: "image",
    previewUrl: `/api/files/${encodeURIComponent(asset.id)}`,
    origin: "Visual collection",
  };
}

export function AutomationBuilderClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const requestedSourceFileId = searchParams.get("sourceFileId")?.trim() || null;
  const requestedTemplate = searchParams.get("template") ?? "story-lesson";
  const initialTemplateId = AUTOMATION_TEMPLATES.some(
    (template) => template.id === requestedTemplate
  )
    ? requestedTemplate
    : AUTOMATION_TEMPLATES[0].id;
  const [record, setRecord] = useState<AutomationRecord>(() =>
    createAutomationRecord(requestedTemplate, {
      sourceFileId: requestedSourceFileId,
    })
  );
  const [phase, setPhase] = useState<Phase>("Hook");
  const [templateOpen, setTemplateOpen] = useState(!editId);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState("All");
  const [templateSort, setTemplateSort] = useState<TemplateSort>("recommended");
  const [templateView, setTemplateView] = useState<TemplateView>("grid");
  const [previewTemplateId, setPreviewTemplateId] = useState(initialTemplateId);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>([]);
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedRecordSignature, setSavedRecordSignature] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  // Keep the server and first client render identical. Query-dependent loading
  // starts after hydration so cold edit deep-links cannot get stuck in a
  // Suspense bailout before their workspace request begins.
  const [loading, setLoading] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [previewSlide, setPreviewSlide] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(58);
  const [integrationStatuses, setIntegrationStatuses] = useState<
    PublicIntegrationStatus[]
  >([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [integrationRefreshKey, setIntegrationRefreshKey] = useState(0);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [collectionAssets, setCollectionAssets] = useState<
    CollectionAssetRecord[]
  >([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [sourceFile, setSourceFile] = useState<AutomationSourceFile | null>(null);
  const [sourceFileLoading, setSourceFileLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        setFavoriteTemplateIds(
          parsed.filter(
            (value): value is string =>
              typeof value === "string" &&
              AUTOMATION_TEMPLATES.some((template) => template.id === value)
          )
        );
      }
    } catch {
      // An unavailable or malformed local preference should never block the builder.
    } finally {
      setFavoritesHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!favoritesHydrated) return;
    try {
      window.localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(favoriteTemplateIds)
      );
    } catch {
      // Favorites can remain session-only when browser storage is unavailable.
    }
  }, [favoriteTemplateIds, favoritesHydrated]);

  useEffect(() => {
    setPreviewSlide((current) =>
      Math.min(current, Math.max(0, record.content.slideCount - 1))
    );
  }, [record.content.slideCount]);

  useEffect(() => {
    let cancelled = false;
    setCollectionsLoading(true);
    fetchWorkspaceFeature<CollectionFeatureRecord>("collections")
      .then(({ records }) => {
        if (!cancelled) {
          setCollections(records.filter(isCollectionRecord));
          setCollectionAssets(records.filter(isCollectionAssetRecord));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCollections([]);
          setCollectionAssets([]);
        }
      })
      .finally(() => {
        if (!cancelled) setCollectionsLoading(false);
      });

    if (!editId) {
      fetchWorkspaceFeature<WorkspaceSettingsDefaults>("connections")
        .then(({ records }) => {
          const defaults = records.find(
            (candidate) => candidate.id === "workspace-settings"
          );
          if (
            cancelled ||
            !defaults ||
            typeof defaults.timezone !== "string" ||
            typeof defaults.approvalDefault !== "boolean"
          ) {
            return;
          }
          setRecord((current) => ({
            ...current,
            approvalRequired: defaults.approvalDefault,
            schedule: {
              ...current.schedule,
              timezone: defaults.timezone,
            },
          }));
        })
        .catch(() => {
          // New plans retain safe built-in defaults when workspace settings fail.
        });
    }

    return () => {
      cancelled = true;
    };
  }, [editId]);

  useEffect(() => {
    const sourceFileId = record.content.sourceFileId;
    if (!sourceFileId) {
      setSourceFile(null);
      setSourceFileLoading(false);
      return;
    }
    const controller = new AbortController();
    setSourceFileLoading(true);
    fetch(`/api/files/${encodeURIComponent(sourceFileId)}/metadata`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Source asset could not be found");
        return (await response.json()) as { file: AutomationSourceFile };
      })
      .then(({ file }) => setSourceFile(file))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setSourceFile(null);
        setError(
          cause instanceof Error
            ? cause.message
            : "Source asset could not be loaded"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setSourceFileLoading(false);
      });
    return () => controller.abort();
  }, [record.content.sourceFileId]);

  useEffect(() => {
    const controller = new AbortController();
    setIntegrationsLoading(true);
    setIntegrationsError(null);
    fetchIntegrations({ signal: controller.signal })
      .then(({ providers }) => setIntegrationStatuses(providers))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setIntegrationStatuses([]);
        setIntegrationsError(
          cause instanceof Error
            ? cause.message
            : "Unable to check social connections"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIntegrationsLoading(false);
      });
    return () => controller.abort();
  }, [integrationRefreshKey]);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    setLoading(true);
    fetchWorkspaceFeature<AutomationRecord>("automations")
      .then(({ records }) => {
        const existing = records.find((candidate) => candidate.id === editId);
        if (!cancelled && existing && isAutomationRecord(existing)) {
          setRecord(existing);
          setSavedRecordSignature(JSON.stringify(existing));
          if (AUTOMATION_TEMPLATES.some((template) => template.id === existing.template)) {
            setPreviewTemplateId(existing.template);
            setSelectedTemplateId(existing.template);
          }
        }
        if (!cancelled && !existing) setError("That automation could not be found.");
      })
      .catch((cause) => !cancelled && setError(cause instanceof Error ? cause.message : "Unable to load automation"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const templateCategories = useMemo(
    () => [
      "All",
      "Favorites",
      ...Array.from(new Set(AUTOMATION_TEMPLATES.map((template) => template.category))),
    ],
    []
  );

  const templateCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: AUTOMATION_TEMPLATES.length,
      Favorites: favoriteTemplateIds.length,
    };
    for (const template of AUTOMATION_TEMPLATES) {
      counts[template.category] = (counts[template.category] ?? 0) + 1;
    }
    return counts;
  }, [favoriteTemplateIds]);

  const templates = useMemo(() => {
    const normalizedSearch = templateSearch.trim().toLowerCase();
    const filtered = AUTOMATION_TEMPLATES.filter((template) => {
      const categoryMatches =
        templateCategory === "All" ||
        (templateCategory === "Favorites"
          ? favoriteTemplateIds.includes(template.id)
          : template.category === templateCategory);
      const searchMatches = `${template.name} ${template.category} ${template.description} ${template.hook} ${template.structure}`
        .toLowerCase()
        .includes(normalizedSearch);
      return categoryMatches && searchMatches;
    });

    return [...filtered].sort((first, second) => {
      if (templateSort === "name") return first.name.localeCompare(second.name);
      if (templateSort === "slides") {
        return first.slides - second.slides || first.name.localeCompare(second.name);
      }
      return (
        AUTOMATION_TEMPLATES.findIndex((template) => template.id === first.id) -
        AUTOMATION_TEMPLATES.findIndex((template) => template.id === second.id)
      );
    });
  }, [favoriteTemplateIds, templateCategory, templateSearch, templateSort]);

  const previewTemplate =
    AUTOMATION_TEMPLATES.find((template) => template.id === previewTemplateId) ??
    AUTOMATION_TEMPLATES[0];
  const selectedTemplate =
    AUTOMATION_TEMPLATES.find((template) => template.id === selectedTemplateId) ??
    AUTOMATION_TEMPLATES[0];
  const selectedCollection = record.content.collectionId
    ? collections.find(
        (collection) => collection.id === record.content.collectionId
      ) ?? null
    : null;
  const previewAsset = selectAutomationPreviewAsset({
    sourceFileId: record.content.sourceFileId ?? null,
    sourceFile,
    collectionId: record.content.collectionId,
    collections,
    collectionAssets,
  });
  const previewEmptyCopy = record.content.sourceFileId
    ? sourceFileLoading
      ? "Loading the attached generated asset…"
      : "The attached generated asset is unavailable. Remove it or choose another source."
    : selectedCollection
      ? selectedCollection.assetIds.length > 0
        ? "The first collection asset is unavailable. Check the collection and try again."
        : `${selectedCollection.name} does not contain a preview asset yet.`
      : "Attach a generated asset or choose a visual collection to preview real media.";
  const recordSignature = JSON.stringify(record);
  const destinationReadiness = resolveAutomationDestination(
    record.destination,
    integrationStatuses,
    isAutomationSocialDestination(record.destination)
      ? (record.accountId ?? null)
      : undefined
  );
  const saveStatus = saving
    ? "Saving draft…"
    : saveFailed
      ? "Save failed — try again"
      : savedRecordSignature === recordSignature
        ? "Draft saved"
        : "Unsaved changes";

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  function applyTemplate(templateId: string) {
    const next = createAutomationRecord(templateId);
    setRecord((current) => ({
      ...next,
      id: current.id,
      createdAt: current.createdAt,
      destination: current.destination,
      accountId: current.accountId ?? null,
      accountLabel: current.accountLabel,
      approvalRequired: current.approvalRequired,
      schedule: current.schedule,
      content: {
        ...next.content,
        collectionId: current.content.collectionId,
        sourceFileId: current.content.sourceFileId ?? null,
      },
    }));
    setSelectedTemplateId(templateId);
    setPreviewTemplateId(templateId);
    setSaveFailed(false);
    setTemplateOpen(false);
    setPhase("Hook");
    notify("Playbook applied");
  }

  function openTemplatePicker() {
    const currentTemplateId = AUTOMATION_TEMPLATES.some(
      (template) => template.id === record.template
    )
      ? record.template
      : AUTOMATION_TEMPLATES[0].id;
    setSelectedTemplateId(currentTemplateId);
    setPreviewTemplateId(currentTemplateId);
    setTemplateOpen(true);
  }

  function selectTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    setPreviewTemplateId(templateId);
  }

  function toggleFavorite(templateId: string) {
    setFavoriteTemplateIds((current) =>
      current.includes(templateId)
        ? current.filter((candidate) => candidate !== templateId)
        : [...current, templateId]
    );
  }

  function updateHook(patch: Partial<AutomationRecord["hook"]>) {
    setRecord((current) => ({ ...current, hook: { ...current.hook, ...patch } }));
  }

  function updateContent(patch: Partial<AutomationRecord["content"]>) {
    setRecord((current) => ({ ...current, content: { ...current.content, ...patch } }));
  }

  function updateCta(patch: Partial<AutomationRecord["cta"]>) {
    setRecord((current) => ({ ...current, cta: { ...current.cta, ...patch } }));
  }

  function toggleDay(day: string) {
    setRecord((current) => ({
      ...current,
      schedule: {
        ...current.schedule,
        days: current.schedule.days.includes(day)
          ? current.schedule.days.filter((candidate) => candidate !== day)
          : [...current.schedule.days, day],
      },
    }));
  }

  function selectDestination(destination: AutomationDestination) {
    const readiness = resolveAutomationDestination(
      destination,
      integrationStatuses
    );
    setRecord((current) => ({
      ...current,
      destination,
      accountId: readiness.accountId,
      accountLabel: readiness.accountLabel,
      approvalRequired:
        isAutomationSocialDestination(destination)
          ? true
          : current.approvalRequired,
    }));
  }

  async function persist(mode: "draft" | "create") {
    if (!record.name.trim()) {
      setError("Give this automation a name before saving.");
      return;
    }
    if (record.schedule.days.length === 0) {
      setError("Choose at least one schedule day.");
      return;
    }
    if (
      mode === "create" &&
      isAutomationSocialDestination(record.destination) &&
      !record.approvalRequired
    ) {
      setError("Social automations require approval before any publishing step.");
      return;
    }
    setSaving(true);
    setSaveFailed(false);
    setError(null);
    const readiness = resolveAutomationDestination(
      record.destination,
      integrationStatuses,
      isAutomationSocialDestination(record.destination)
        ? (record.accountId ?? null)
        : undefined
    );
    const nextStatus =
      mode === "draft"
        ? "draft"
        : automationStatusAfterReview(record.destination, integrationStatuses, {
            approvalRequired: record.approvalRequired,
            accountId: record.accountId ?? null,
          });
    const next: AutomationRecord = {
      ...record,
      name: record.name.trim(),
      status: nextStatus,
      executionEnabled: false,
      accountId:
        record.destination === "manual"
          ? null
          : record.accountId ?? null,
      accountLabel:
        record.destination === "manual"
          ? null
          : readiness.ready
            ? readiness.accountLabel
            : record.accountLabel,
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveWorkspaceFeature("automations", next);
      setRecord(next);
      setSavedRecordSignature(JSON.stringify(next));
      notify(mode === "draft" ? "Draft saved" : "Automation saved");
      if (mode === "create") window.setTimeout(() => router.push("/automations"), 350);
    } catch (cause) {
      setSaveFailed(true);
      setError(cause instanceof Error ? cause.message : "Unable to save automation");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="pf-content-viewport grid place-items-center"><Loader2 className="size-7 animate-spin text-[var(--pf-orange)]" /></div>;

  const phaseIndex = PHASES.indexOf(phase);
  const slideCopy = [record.hook.selected, record.content.structure, "One concrete point per slide", record.content.guidance, record.cta.style];
  const socialApprovalMissing =
    isAutomationSocialDestination(record.destination) &&
    !record.approvalRequired;

  return (
    <div className="pf-content-viewport flex flex-col bg-[var(--pf-canvas)]">
      <header className="flex min-h-[82px] flex-wrap items-center justify-between gap-3 border-b border-border bg-[var(--pf-active)] px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3"><Link href="/automations" aria-label="Back to automations" className="grid size-9 place-items-center rounded-lg border border-border bg-white"><ArrowLeft className="size-4" /></Link><div className="min-w-0"><input value={record.name} onChange={(event) => setRecord((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full min-w-0 bg-transparent text-[15px] font-semibold tracking-[-0.01em] outline-none" aria-label="Automation name" /></div><span className="rounded-full bg-[var(--pf-active)] px-2 py-1 text-[12px] font-bold text-muted-foreground">{record.status.replace("_", " ").toUpperCase()}</span></div>
        <div className="flex flex-wrap items-center justify-end gap-2"><span role="status" aria-live="polite" className={cn("mr-1 text-[12px] font-medium",saveFailed ? "text-[var(--pf-danger)]" : savedRecordSignature === recordSignature ? "text-[var(--pf-success)]" : "text-muted-foreground")}>{saveStatus}</span><button onClick={openTemplatePicker} className="pf-button-secondary"><LayoutTemplate className="size-3.5" /> Playbook</button><button onClick={() => persist("draft")} disabled={saving} className="pf-button-secondary">{saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save draft</button><button onClick={() => setValidationOpen(true)} className="pf-button-primary">Review automation <ArrowRight className="size-3.5" /></button></div>
      </header>

      <div className="flex min-h-[59px] items-center justify-between gap-4 overflow-x-auto border-b border-[var(--pf-border)] bg-white px-3 sm:px-6">
        <div className="flex h-[59px]">{PHASES.map((item, index) => <button key={item} onClick={() => setPhase(item)} className={cn("relative grid min-w-[118px] grid-cols-[24px_1fr] items-center gap-2 px-3 text-left text-[12px] font-semibold text-muted-foreground",phase === item && "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--pf-orange)]")}><span className={cn("grid size-5 place-items-center rounded-full bg-[var(--pf-active)] text-[12px]",phase === item && "bg-[var(--pf-orange)] text-white")}>0{index + 1}</span><span>{item}<small className="mt-0.5 block text-[11px] font-normal text-muted-foreground">{phase === item ? "Editing" : index < phaseIndex ? "Complete" : ""}</small></span></button>)}</div>
        <span className="hidden rounded-full bg-[var(--pf-active)] px-2.5 py-1 text-[12px] text-muted-foreground sm:block">{record.template.replaceAll("-", " ")}</span>
      </div>

      {error && <div role="alert" className="mx-4 mt-3 flex min-w-0 items-start justify-between gap-3 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] text-[var(--pf-danger)] sm:mx-6"><span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{error}</span><button onClick={() => setError(null)} className="shrink-0" aria-label="Dismiss error"><X className="size-3.5 shrink-0" /></button></div>}

      <section className="grid min-h-0 flex-1 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="relative border-b border-[var(--pf-border)] bg-card p-5 lg:border-b-0 lg:border-r">
          <div className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--pf-active)] text-[13px] font-semibold text-muted-foreground">0{phaseIndex + 1}</span><div><h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em]">{phase === "Hook" ? "Stop the scroll" : phase === "Content" ? "Deliver the value" : "Close with intent"}</h2><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{phase === "Hook" ? "Choose how the first slide earns attention." : phase === "Content" ? "Shape the repeatable middle of every post." : "Decide what the final slide asks viewers to do."}</p></div></div>
          <div className="mt-5 space-y-4">
            {phase === "Hook" && <><Field label="Hook strategy"><Select value={record.hook.strategy} onChange={(value) => updateHook({ strategy: value })} options={["Curiosity gap","Unexpected result","Contrarian truth","Specific transformation","Concrete promise"]} /></Field><Field label="Hook prompt"><textarea value={record.hook.prompt} onChange={(event) => updateHook({ prompt: event.target.value })} className="pf-input h-24" /></Field><div><button type="button" disabled={!record.hook.prompt.trim()} onClick={() => updateHook({ selected: composeAutomationHook(record.hook.strategy, record.hook.prompt) })} className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 text-[13px] font-semibold text-[var(--pf-danger)] disabled:cursor-not-allowed disabled:opacity-45"><Sparkles className="size-3.5" /> Compose from prompt</button><p className="mt-1.5 text-[11px] leading-3 text-muted-foreground">Composed locally from your prompt and strategy. No network request.</p></div><Field label="Selected hook"><input value={record.hook.selected} onChange={(event) => updateHook({ selected: event.target.value })} className="pf-input h-10" /></Field></>}
            {phase === "Content" && (
              <>
                <Field label="Story structure">
                  <Select
                    value={record.content.structure}
                    onChange={(value) => updateContent({ structure: value })}
                    options={["Problem → Shift → Result", "3 quick lessons", "Before → Change → After", "Myth → Evidence → Reality", "Product → Proof → Outcome"]}
                  />
                </Field>
                <Field label={`Slides per post · ${record.content.slideCount}`}>
                  <input type="range" min="3" max="9" value={record.content.slideCount} onChange={(event) => updateContent({ slideCount: Number(event.target.value) })} className="w-full accent-[var(--pf-orange)]" />
                </Field>
                {record.content.sourceFileId && (
                  <Field label="Attached generated asset">
                    <div className="flex min-h-14 items-center gap-2 rounded-lg border border-border bg-white p-2">
                      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--pf-active)]">
                        {sourceFile?.type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sourceFile.previewUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <ImageIcon className="size-4 text-muted-foreground" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[11px]">{sourceFileLoading ? "Checking source asset…" : sourceFile?.filename ?? "Source asset unavailable"}</b>
                        <small className="mt-0.5 block text-[11px] text-muted-foreground">Persisted with this plan for the creative handoff</small>
                      </span>
                      <button type="button" onClick={() => updateContent({ sourceFileId: null })} className="grid size-7 shrink-0 place-items-center rounded-lg border border-border" aria-label="Remove source asset"><X className="size-3" /></button>
                    </div>
                  </Field>
                )}
                <Field label="Visual collection">
                  <select
                    value={record.content.collectionId ?? ""}
                    onChange={(event) => updateContent({ collectionId: event.target.value || null })}
                    className="pf-input h-10"
                    disabled={collectionsLoading}
                  >
                    <option value="">{collectionsLoading ? "Loading collections…" : "No collection selected"}</option>
                    {collections.map((collection) => (
                      <option key={collection.id} value={collection.id}>{collection.name} · {collection.assetIds.length} assets</option>
                    ))}
                  </select>
                  <Link href="/collections" className="mt-1.5 inline-flex text-[11px] font-semibold text-[var(--pf-danger)]">Manage collections →</Link>
                </Field>
                <Field label="Writing guidance">
                  <textarea value={record.content.guidance} onChange={(event) => updateContent({ guidance: event.target.value })} className="pf-input h-24" />
                </Field>
              </>
            )}
            {phase === "CTA" && <><Field label="CTA style"><Select value={record.cta.style} onChange={(value) => updateCta({ style: value })} options={["Save this post","Follow for part two","Comment a keyword","Visit profile link","No CTA"]} /></Field><Field label="CTA prompt"><textarea value={record.cta.prompt} onChange={(event) => updateCta({ prompt: event.target.value })} className="pf-input h-24" /></Field><DestinationSelector destination={record.destination} accountId={record.accountId ?? null} providers={integrationStatuses} loading={integrationsLoading} error={integrationsError} onSelect={selectDestination} onAccountSelect={(accountId, accountLabel) => setRecord((current) => ({ ...current, accountId, accountLabel }))} onRetry={() => setIntegrationRefreshKey((current) => current + 1)} /><label className="flex items-center justify-between gap-3 border-t border-border pt-4"><span><b className="block text-[12px]">Require approval</b><small className="mt-1 block text-[12px] leading-3 text-muted-foreground">{isAutomationSocialDestination(record.destination) ? "Required for every social publishing destination" : "Keep a review decision in the local workflow"}</small></span><input type="checkbox" checked={record.approvalRequired} disabled={isAutomationSocialDestination(record.destination)} onChange={(event) => setRecord((current) => ({ ...current, approvalRequired: event.target.checked }))} aria-describedby="automation-approval-rule" className="size-4 shrink-0 accent-[var(--pf-orange)] disabled:cursor-not-allowed disabled:opacity-70" /><span id="automation-approval-rule" className="sr-only">Social publishing destinations always require approval.</span></label></>}
            <fieldset><legend className="mb-2 text-[13px] font-semibold text-muted-foreground">Schedule</legend><div className="grid grid-cols-7 gap-1">{DAYS.map((day) => <button type="button" key={day} onClick={() => toggleDay(day)} aria-label={`Toggle ${day}`} aria-pressed={record.schedule.days.includes(day)} className={cn("h-8 rounded-lg border text-[12px]",record.schedule.days.includes(day) ? "border-[var(--pf-ink)] bg-foreground text-background" : "border-border bg-white text-muted-foreground")}>{day[0]}</button>)}</div><div className="mt-2 grid grid-cols-2 gap-2"><input type="time" aria-label="Publish time" value={record.schedule.time} onChange={(event) => setRecord((current) => ({ ...current, schedule: { ...current.schedule, time: event.target.value } }))} className="pf-input h-9" /><select aria-label="Schedule timezone" value={record.schedule.timezone} onChange={(event) => setRecord((current) => ({ ...current, schedule: { ...current.schedule, timezone: event.target.value } }))} className="pf-input h-9"><option>America/Toronto</option><option>America/New_York</option><option>America/Los_Angeles</option><option>Europe/London</option></select></div></fieldset>
          </div>
          <div className="mt-7 flex justify-between border-t border-border pt-4"><button onClick={() => setPhase(PHASES[Math.max(0, phaseIndex - 1)])} disabled={phaseIndex === 0} className="pf-button-secondary disabled:opacity-40"><ArrowLeft className="size-3" /> Back</button><button onClick={() => phaseIndex === 2 ? setValidationOpen(true) : setPhase(PHASES[phaseIndex + 1])} className="inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-3 text-[13px] font-semibold text-white">{phaseIndex === 2 ? "Review" : "Next"}<ArrowRight className="size-3" /></button></div>
        </aside>

        <div className="flex min-w-0 flex-col bg-[var(--pf-active)]">
          <div className="flex h-12 items-center justify-between border-b border-[var(--pf-border)] bg-white px-4"><div><b className="mt-0.5 block text-[11px]">Slide {previewSlide + 1} of {record.content.slideCount}</b></div><div className="flex items-center gap-1 text-[12px] text-muted-foreground" aria-label="Preview zoom controls"><button type="button" onClick={() => setPreviewZoom((current) => clampPreviewZoom(current - PREVIEW_ZOOM_STEP))} disabled={previewZoom === PREVIEW_ZOOM_MIN} aria-label="Zoom preview out" className="grid size-6 place-items-center rounded-lg border border-border bg-white disabled:cursor-not-allowed disabled:opacity-35"><Minus className="size-3" /></button><output aria-live="polite" className="w-9 text-center tabular-nums">{previewZoom}%</output><button type="button" onClick={() => setPreviewZoom((current) => clampPreviewZoom(current + PREVIEW_ZOOM_STEP))} disabled={previewZoom === PREVIEW_ZOOM_MAX} aria-label="Zoom preview in" className="grid size-6 place-items-center rounded-lg border border-border bg-white disabled:cursor-not-allowed disabled:opacity-35"><Plus className="size-3" /></button></div></div>
          <div className="grid min-h-[610px] flex-1 place-items-center overflow-auto bg-[#09090B] p-5">
            <div style={{ width: `${Math.round((320 * previewZoom) / 58)}px` }} className="relative aspect-[9/16] shrink-0 overflow-hidden rounded-lg border-[6px] border-white bg-[#09090B] shadow-[0_22px_52px_rgba(34,35,31,.19)] transition-[width] duration-150 motion-reduce:transition-none">
              <div className="absolute inset-0 grid place-items-center bg-[var(--pf-active)] p-8 text-center text-muted-foreground">
                <div>
                  <span className="mx-auto grid size-12 place-items-center rounded-full border border-border bg-white"><ImageIcon className="size-5" /></span>
                  <b className="mt-3 block text-[12px] text-foreground">No real media preview</b>
                  <p className="mt-1 text-[12px] leading-3">{previewEmptyCopy}</p>
                </div>
              </div>
              {previewAsset && <AutomationPreviewMedia asset={previewAsset} className="absolute inset-0 size-full object-cover" />}
              {previewAsset && <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />}
              {previewAsset && <span className="absolute left-3 top-3 z-20 max-w-[calc(100%-24px)] truncate rounded-full bg-black/65 px-2 py-1 text-[11px] font-semibold text-white">{previewAsset.origin} · {previewAsset.name}</span>}
              <div className={cn("absolute inset-x-5 z-20 min-w-0 break-words text-center [overflow-wrap:anywhere]", previewAsset ? "text-white drop-shadow-md" : "bottom-8 rounded-lg bg-white/95 p-3 text-foreground shadow-sm", previewAsset && (previewSlide === record.content.slideCount - 1 ? "bottom-10 rounded-lg bg-black/55 p-3" : previewSlide === 0 ? "top-14" : "top-[44%]") )}>
                <span className="block text-[13px] font-semibold uppercase tracking-[.09em]">{previewSlide === 0 ? record.hook.strategy : previewSlide === record.content.slideCount - 1 ? "Keep this for later" : `Point ${previewSlide}`}</span>
                <b className="mt-1 block min-w-0 break-words font-serif text-[20px] italic leading-tight [overflow-wrap:anywhere]">{slideCopy[Math.min(previewSlide, slideCopy.length - 1)]}</b>
              </div>
              <span className="absolute bottom-2 right-2 z-20 rounded-full bg-black/70 px-2 py-1 text-[12px] text-white">{previewSlide + 1} / {record.content.slideCount}</span>
            </div>
          </div>
          <div className="flex h-24 gap-2 overflow-x-auto border-t border-[var(--pf-border)] bg-white p-3">{Array.from({ length: record.content.slideCount }, (_, index) => <button key={index} type="button" onClick={() => setPreviewSlide(index)} aria-label={`Preview slide ${index + 1}`} aria-pressed={previewSlide === index} className={cn("relative aspect-[9/16] h-16 shrink-0 overflow-hidden rounded-lg border-2 bg-[var(--pf-active)]",previewSlide === index ? "border-[var(--pf-orange)]" : "border-transparent")}>{previewAsset?.kind === "image" ? <AutomationPreviewMedia asset={previewAsset} className="size-full object-cover" /> : <span className="absolute inset-0 grid place-items-center text-muted-foreground"><ImageIcon className="size-3" /></span>}<span className="absolute bottom-1 right-1 grid size-3 place-items-center rounded-full bg-black/70 text-[11px] text-white">{index + 1}</span></button>)}<button type="button" onClick={() => setRecord((current) => ({ ...current, content: { ...current.content, slideCount: Math.min(9, current.content.slideCount + 1) } }))} className="flex aspect-[9/16] h-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--pf-border-strong)] text-muted-foreground"><Plus className="size-3" /><span className="text-[11px]">Add</span></button></div>
        </div>
      </section>

      {templateOpen && (
        <PlaybookPicker
          templates={templates}
          categories={templateCategories}
          categoryCounts={templateCategoryCounts}
          category={templateCategory}
          onCategoryChange={setTemplateCategory}
          search={templateSearch}
          onSearchChange={setTemplateSearch}
          sort={templateSort}
          onSortChange={setTemplateSort}
          view={templateView}
          onViewChange={setTemplateView}
          favorites={favoriteTemplateIds}
          onToggleFavorite={toggleFavorite}
          previewTemplate={previewTemplate}
          onPreview={setPreviewTemplateId}
          selectedTemplateId={selectedTemplateId}
          selectedTemplate={selectedTemplate}
          onSelect={selectTemplate}
          onBuildFromScratch={() => selectTemplate("custom")}
          onApply={() => applyTemplate(selectedTemplate.id)}
          onClose={() => setTemplateOpen(false)}
        />
      )}

      {validationOpen && <div className="pf-safe-overlay fixed inset-0 z-[85] grid min-w-0 place-items-center bg-black/45 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="max-h-full w-full min-w-0 max-w-[390px] overflow-y-auto rounded-[12px] bg-white p-6 text-center shadow-2xl"><span className={cn("mx-auto grid size-11 shrink-0 place-items-center rounded-full",socialApprovalMissing ? "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]" : "bg-[var(--pf-success)]/10 text-[var(--pf-success)]")}>{socialApprovalMissing ? <X className="size-5 shrink-0" /> : <Check className="size-5 shrink-0" />}</span><h2 className="mt-4 text-[20px] font-semibold tracking-[-0.02em]">{socialApprovalMissing ? "Approval is required" : "Creative setup looks good"}</h2><p className="mt-1 min-w-0 break-words text-[11px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">Saving creates a paused plan. Manual Review queue schedules can create local drafts. Social publishing stays separate and requires an approved Gallery video, a live provider check, and explicit confirmation for every post.</p><div className="my-5 min-w-0 space-y-2 text-left text-[11px]"><ValidationRow ok text="Hook, content, and CTA configured" /><ValidationRow ok={record.destination === "manual" || record.approvalRequired} text={record.destination === "manual" ? "Local review plan" : record.approvalRequired ? "Approval required before any provider handoff" : "Social handoffs require approval"} /><ValidationRow ok={record.destination === "manual" || (!integrationsLoading && destinationReadiness.ready)} text={record.destination !== "manual" && integrationsLoading ? `Checking ${automationDestinationLabel(record.destination)} connection readiness` : destinationReadiness.message} /></div><div className="flex min-w-0 flex-col-reverse justify-center gap-2 min-[420px]:flex-row"><button onClick={() => setValidationOpen(false)} className="pf-button-secondary shrink-0">Return to setup</button><button onClick={() => { setValidationOpen(false); persist("create"); }} disabled={saving || socialApprovalMissing} className="pf-button-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-45">{saving ? <Loader2 className="size-3.5 shrink-0 animate-spin" /> : <Save className="size-3.5 shrink-0" />} {record.destination !== "manual" && !destinationReadiness.ready ? "Save for connection" : "Save reviewed plan"}</button></div></div></div>}
      {toast && <div role="status" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[90] flex min-w-0 items-center gap-2 rounded-lg bg-foreground px-3 py-2.5 text-[12px] font-medium text-white shadow-xl sm:left-auto sm:max-w-[420px]"><Check className="size-3.5 shrink-0 text-[var(--pf-success)]" /><span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{toast}</span></div>}
      <style jsx>{`.pf-input{width:100%;border:1px solid var(--pf-border);border-radius:8px;background:var(--pf-surface);color:var(--pf-ink);padding:0 10px;font-size:13px;outline:none;resize:none}.pf-input:focus{border-color:var(--pf-orange);box-shadow:0 0 0 3px color-mix(in oklch, var(--pf-orange) 12%, transparent)}`}</style>
    </div>
  );
}

function AutomationPreviewMedia({
  asset,
  className,
}: {
  asset: AutomationPreviewAsset;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (asset.kind === "video") {
    return (
      <VideoFramePreview
        src={asset.previewUrl}
        label={`${asset.name} preview`}
        className={className}
      />
    );
  }

  if (imageFailed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.previewUrl}
      alt={`${asset.name} preview`}
      onError={() => setImageFailed(true)}
      className={className}
    />
  );
}

function DestinationSelector({
  destination,
  accountId,
  providers,
  loading,
  error,
  onSelect,
  onAccountSelect,
  onRetry,
}: {
  destination: AutomationDestination;
  accountId: string | null;
  providers: readonly PublicIntegrationStatus[];
  loading: boolean;
  error: string | null;
  onSelect: (destination: AutomationDestination) => void;
  onAccountSelect: (accountId: string, accountLabel: string) => void;
  onRetry: () => void;
}) {
  const readiness = resolveAutomationDestination(
    destination,
    providers,
    destination === "manual" ? undefined : accountId
  );
  const providerStatus = readiness.providerStatus;
  const options: readonly {
    id: AutomationDestination;
    label: string;
  }[] = [
    { id: "manual", label: "Review queue" },
    ...AUTOMATION_SOCIAL_DESTINATIONS,
  ];

  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-semibold text-muted-foreground">
        Destination
      </legend>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((option) => {
          const optionReadiness = resolveAutomationDestination(
            option.id,
            providers
          );
          const selected = destination === option.id;
          const statusLabel =
            option.id === "manual"
              ? "Local review"
              : loading
                ? "Checking…"
                : error || optionReadiness.code === "unavailable"
                  ? "Unavailable"
                  : optionReadiness.ready
                    ? "Ready"
                    : optionReadiness.code === "missing_publish"
                      ? "Scope missing"
                      : optionReadiness.code === "not_configured"
                        ? "Not configured"
                        : "Disconnected";
          return (
            <button
              type="button"
              key={option.id}
              onClick={() => onSelect(option.id)}
              aria-pressed={selected}
              className={cn(
                "flex min-h-14 items-center gap-2 rounded-lg border bg-white px-2.5 text-left transition-colors",
                selected
                  ? "border-[var(--pf-ink)] ring-2 ring-[var(--pf-ink)]/10"
                  : "border-border hover:border-[var(--pf-border-strong)]"
              )}
            >
              <span className="grid size-7 shrink-0 place-items-center">
                {option.id === "manual" ? (
                  <span className="grid size-6 place-items-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
                    <Inbox className="size-3.5" />
                  </span>
                ) : (
                  <SocialProviderIcon
                    provider={option.id}
                    label={option.label}
                    youtubeVariant="shorts"
                    className="size-6"
                  />
                )}
              </span>
              <span className="min-w-0">
                <b className="block truncate text-[11px]">{option.label}</b>
                <small
                  className={cn(
                    "mt-0.5 block truncate text-[11px]",
                    optionReadiness.ready || option.id === "manual"
                      ? "text-[var(--pf-success)]"
                      : "text-[var(--pf-danger)]"
                  )}
                >
                  {statusLabel}
                </small>
              </span>
            </button>
          );
        })}
      </div>

      {destination !== "manual" && (
        <div
          className={cn(
            "mt-2 rounded-lg border p-3 text-[11px]",
            readiness.ready
              ? "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10"
              : "border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10"
          )}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Checking the live {automationDestinationLabel(destination)} connection…
            </div>
          ) : error ? (
            <div>
              <b className="flex items-center gap-1.5 text-[var(--pf-danger)]">
                <X className="size-3" /> Connection check failed
              </b>
              <p className="mt-1 min-w-0 break-words leading-4 text-[var(--pf-danger)] [overflow-wrap:anywhere]">
                {error}. This destination will remain gated.
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 font-semibold text-[var(--pf-danger)]"
              >
                Check again →
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <b className={readiness.ready ? "text-[var(--pf-success)]" : "text-[var(--pf-danger)]"}>
                    {readiness.ready ? "Connection verified" : "Connection required"}
                  </b>
                  <p className="mt-1 min-w-0 break-words leading-4 text-[var(--pf-danger)] [overflow-wrap:anywhere]">
                    {readiness.message}
                  </p>
                </span>
                {providerStatus && (
                  <SocialProviderIcon
                    provider={providerStatus.provider}
                    label={providerStatus.displayName}
                    youtubeVariant="shorts"
                    className="size-7 shrink-0"
                  />
                )}
              </div>

              {providerStatus?.connected && providerStatus.accounts.length > 0 && (
                <label className="mt-3 block border-t border-black/8 pt-3">
                  <span className="mb-1.5 block text-[12px] font-semibold text-muted-foreground">
                    Connected account
                  </span>
                  <select
                    value={accountId ?? ""}
                    onChange={(event) => {
                      const selected = providerStatus.accounts.find(
                        (candidate) =>
                          candidate.account.id === event.target.value
                      );
                      onAccountSelect(
                        event.target.value,
                        selected
                          ? integrationAccountLabel(selected.account) ??
                              "Connected account"
                          : "Connected account"
                      );
                    }}
                    className="h-9 w-full rounded-lg border border-border bg-white px-2 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                    aria-label="Connected social account"
                  >
                    <option value="" disabled>
                      Select one of the connected accounts
                    </option>
                    {providerStatus.accounts.map((candidate) => (
                      <option
                        key={candidate.account.id}
                        value={candidate.account.id}
                      >
                        {integrationAccountLabel(candidate.account) ??
                          "Connected account"}
                        {candidate.capabilities.publish ? "" : " (no upload scope)"}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {providerStatus && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-[var(--pf-surface)] px-2 py-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="size-3.5" /> Upload capability
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-[11px] font-bold",
                      readiness.ready
                        ? "bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
                        : "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
                    )}
                  >
                    {readiness.ready ? "Granted" : "Missing"}
                  </span>
                </div>
              )}

              {!readiness.ready &&
                readiness.code !== "account_changed" &&
                readiness.code !== "account_unbound" && (
                <Link
                  href={
                    providerStatus?.configuration === "ready"
                      ? providerStatus.connectUrl
                      : "/settings?tab=integrations"
                  }
                  className="mt-2 inline-block font-semibold text-[var(--pf-danger)]"
                >
                  {providerStatus?.configuration === "ready"
                    ? `Connect ${providerStatus.displayName}`
                    : "Open integrations"} →
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </fieldset>
  );
}

function PlaybookPicker({
  templates,
  categories,
  categoryCounts,
  category,
  onCategoryChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  favorites,
  onToggleFavorite,
  previewTemplate,
  onPreview,
  selectedTemplateId,
  selectedTemplate,
  onSelect,
  onBuildFromScratch,
  onApply,
  onClose,
}: {
  templates: readonly AutomationTemplate[];
  categories: string[];
  categoryCounts: Record<string, number>;
  category: string;
  onCategoryChange: (category: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sort: TemplateSort;
  onSortChange: (sort: TemplateSort) => void;
  view: TemplateView;
  onViewChange: (view: TemplateView) => void;
  favorites: string[];
  onToggleFavorite: (templateId: string) => void;
  previewTemplate: AutomationTemplate;
  onPreview: (templateId: string) => void;
  selectedTemplateId: string;
  selectedTemplate: AutomationTemplate;
  onSelect: (templateId: string) => void;
  onBuildFromScratch: () => void;
  onApply: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="pf-safe-overlay fixed inset-0 z-[80] grid place-items-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="flex h-full max-h-[860px] w-full max-w-[1180px] flex-col overflow-hidden rounded-[12px] bg-card shadow-2xl sm:rounded-[20px]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-white px-4 py-4 sm:px-5">
          <div>

            <h2
              id="template-title"
              className="mt-1 text-[20px] font-semibold tracking-[-0.02em]"
            >
              Choose a playbook
            </h2>
            <p className="mt-1 max-w-[560px] text-[11px] leading-4 text-muted-foreground sm:text-[12px]">
              Start with a proven Hook, Content, and CTA structure. Preview it,
              select it, then apply when you are ready.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close playbook picker"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-white hover:bg-[var(--pf-active)]"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] overflow-y-auto lg:grid-cols-[170px_minmax(0,1fr)] lg:overflow-hidden">
          <aside className="border-b border-border bg-[var(--pf-active)] p-3 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-4">
            <div className="mb-2 flex items-center gap-2 px-1 text-[12px] font-bold uppercase tracking-[0.11em] text-muted-foreground">
              <SlidersHorizontal className="size-3" /> Categories
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
              {categories.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => onCategoryChange(item)}
                  aria-pressed={category === item}
                  className={cn(
                    "flex h-9 shrink-0 items-center justify-between gap-4 rounded-lg px-2.5 text-left text-[11px] font-medium transition-colors",
                    category === item
                      ? "bg-foreground text-white"
                      : "text-muted-foreground hover:bg-[var(--pf-active)]"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {item === "Favorites" && (
                      <Heart className="size-3" fill={category === item ? "currentColor" : "none"} />
                    )}
                    {item}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                      category === item ? "bg-white/15" : "bg-[var(--pf-active)] text-muted-foreground"
                    )}
                  >
                    {categoryCounts[item] ?? 0}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onBuildFromScratch}
              className="mt-3 flex min-h-14 w-full shrink-0 items-center gap-2 rounded-lg border border-dashed border-[var(--pf-border-strong)] bg-white px-3 text-left hover:border-[var(--pf-orange)] lg:mt-5"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-foreground text-white">
                <Plus className="size-3.5" />
              </span>
              <span>
                <b className="block text-[11px]">Build from scratch</b>
                <small className="mt-0.5 block text-[11px] text-muted-foreground">Blank three-phase workflow</small>
              </span>
            </button>
          </aside>

          <section className="min-w-0 bg-card lg:overflow-y-auto">
            <div className="sticky top-0 z-10 border-b border-border bg-[var(--pf-surface)] p-3 backdrop-blur sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-[var(--pf-active)] px-3 focus-within:border-[var(--pf-orange)] focus-within:ring-2 focus-within:ring-[var(--pf-orange)]/10">
                  <Search className="size-3.5 shrink-0 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[12px] outline-none"
                    placeholder="Search playbooks, formats, or outcomes…"
                    aria-label="Search playbooks"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => onSearchChange("")}
                      aria-label="Clear playbook search"
                      className="grid size-5 place-items-center rounded-full hover:bg-[var(--pf-active)]"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </label>
                <label className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-2 text-[12px] text-muted-foreground">
                  Sort
                  <select
                    value={sort}
                    onChange={(event) => onSortChange(event.target.value as TemplateSort)}
                    className="bg-transparent text-[13px] font-semibold text-foreground outline-none"
                    aria-label="Sort playbooks"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="name">Name</option>
                    <option value="slides">Slides</option>
                  </select>
                </label>
                <div className="flex h-9 rounded-lg border border-border bg-white p-1" aria-label="Playbook view">
                  <button
                    type="button"
                    onClick={() => onViewChange("grid")}
                    aria-label="Grid view"
                    aria-pressed={view === "grid"}
                    className={cn("grid w-7 place-items-center rounded-lg", view === "grid" && "bg-[var(--pf-active)]")}
                  >
                    <Grid2X2 className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewChange("list")}
                    aria-label="List view"
                    aria-pressed={view === "list"}
                    className={cn("grid w-7 place-items-center rounded-lg", view === "list" && "bg-[var(--pf-active)]")}
                  >
                    <List className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[12px] text-muted-foreground">
                <span>{templates.length} {templates.length === 1 ? "playbook" : "playbooks"}</span>
                <span>{category === "All" ? "All categories" : category}</span>
              </div>
            </div>

            {templates.length === 0 ? (
              <div className="grid min-h-[330px] place-items-center p-8 text-center">
                <div>
                  <Search className="mx-auto size-6 text-muted-foreground" />
                  <h3 className="mt-3 text-[13px] font-semibold">No matching playbooks</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">Try another search or category.</p>
                  <button
                    type="button"
                    onClick={() => {
                      onSearchChange("");
                      onCategoryChange("All");
                    }}
                    className="pf-button-secondary mt-4"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            ) : (
              <div className={cn("grid gap-3 p-3 sm:p-4", view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
                {templates.map((template) => (
                  <PlaybookCard
                    key={template.id}
                    template={template}
                    view={view}
                    favorite={favorites.includes(template.id)}
                    selected={selectedTemplateId === template.id}
                    previewing={previewTemplate.id === template.id}
                    onToggleFavorite={() => onToggleFavorite(template.id)}
                    onPreview={() => onPreview(template.id)}
                    onSelect={() => onSelect(template.id)}
                  />
                ))}
              </div>
            )}
          </section>

        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-border bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(35,35,35,.06)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg font-serif text-[13px] font-bold italic text-white", TEMPLATE_VISUALS[selectedTemplate.id])}>
              {templateNumber(selectedTemplate)}
            </span>
            <span className="min-w-0">
              <small className="block text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Selected playbook</small>
              <b className="mt-0.5 block truncate text-[12px]">{selectedTemplate.name}</b>
            </span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="pf-button-secondary flex-1 sm:flex-none">Cancel</button>
            <button type="button" onClick={onApply} className="pf-button-primary flex-1 sm:flex-none">
              Apply playbook <ArrowRight className="size-3.5" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function PlaybookCard({
  template,
  view,
  favorite,
  selected,
  previewing,
  onToggleFavorite,
  onPreview,
  onSelect,
}: {
  template: AutomationTemplate;
  view: TemplateView;
  favorite: boolean;
  selected: boolean;
  previewing: boolean;
  onToggleFavorite: () => void;
  onPreview: () => void;
  onSelect: () => void;
}) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-lg border bg-white transition-colors",
        selected ? "border-[var(--pf-orange)] ring-2 ring-[var(--pf-orange)]/10" : previewing ? "border-[var(--pf-border-strong)]" : "border-border hover:border-[var(--pf-border-strong)]",
        view === "list" && "grid sm:grid-cols-[124px_minmax(0,1fr)]"
      )}
    >
      <div className={cn("relative overflow-hidden", TEMPLATE_VISUALS[template.id], view === "grid" ? "h-28" : "h-28 sm:h-full sm:min-h-[138px]")}>
        <span className="absolute left-4 top-4 font-serif text-2xl font-bold italic text-white">{templateNumber(template)}</span>
        <span className="absolute bottom-2 left-3 rounded-full bg-black/65 px-2 py-1 text-[11px] text-white">{template.slides} slides</span>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={favorite ? `Remove ${template.name} from favorites` : `Add ${template.name} to favorites`}
          aria-pressed={favorite}
          className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-white/90 text-foreground shadow-sm hover:bg-white"
        >
          <Heart className={cn("size-3.5", favorite && "fill-[var(--pf-orange)] text-[var(--pf-orange)]")} />
        </button>
      </div>
      <div className="flex min-w-0 flex-col p-3">
        <span className="text-[11px] font-bold uppercase tracking-[.09em] text-[var(--pf-orange)]">{template.category}</span>
        <div className="mt-1 flex items-start justify-between gap-2">
          <h3 className="text-[13px] font-semibold">{template.name}</h3>
          {selected && <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--pf-success)]" aria-label="Selected" />}
        </div>
        <p className="mt-1 min-h-8 text-[12px] leading-4 text-muted-foreground">{template.description}</p>
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-2">
          <button type="button" onClick={onPreview} className="h-7 flex-1 rounded-lg border border-border text-[12px] font-semibold hover:bg-[var(--pf-active)]">
            Preview
          </button>
          <button
            type="button"
            onClick={onSelect}
            className={cn("flex h-7 flex-1 items-center justify-center gap-1 rounded-lg text-[12px] font-semibold", selected ? "bg-[var(--pf-success)]/10 text-[var(--pf-success)]" : "bg-foreground text-white")}
          >
            {selected && <Check className="size-2.5" />}
            {selected ? "Selected" : "Select"}
          </button>
        </div>
      </div>
    </article>
  );
}

function templateNumber(template: AutomationTemplate) {
  if (template.id === "custom") return "+";
  const index = AUTOMATION_TEMPLATES.findIndex((candidate) => candidate.id === template.id);
  return `0${index + 1}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">{label}</span>{children}</label>;
}

function Select({ value, onChange, options, labels }: { value: string; onChange: (value: string) => void; options: readonly string[]; labels?: Record<string, string> }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-[var(--pf-surface)] px-2 text-[11px] text-[var(--pf-ink)] outline-none focus:border-[var(--pf-orange)]">{options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}</select>;
}

function ValidationRow({ ok, text }: { ok: boolean; text: string }) {
  return <div className="flex min-w-0 items-start gap-2"><span className={cn("grid size-5 shrink-0 place-items-center rounded-full",ok ? "bg-[var(--pf-success)]/10 text-[var(--pf-success)]" : "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]")}>{ok ? <Check className="size-3 shrink-0" /> : <X className="size-3 shrink-0" />}</span><span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{text}</span></div>;
}
