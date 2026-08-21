"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AUTOMATION_TEMPLATES,
  createAutomationRecord,
  isAutomationRecord,
  isAutomationSocialDestination,
  resolveAutomationDestination,
  type AutomationDestination,
  type AutomationRecord,
} from "@/lib/automations";
import { fetchWorkspaceFeature, saveWorkspaceFeature } from "@/lib/workspace-features-client";
import { selectAutomationPreviewAsset } from "./automation-builder-preview";
import {
  applyPlaybookToRecord,
  destinationSelectionPatch,
  preparePlanSave,
} from "./automation-builder-plan";
import {
  DAYS,
  filterPlaybooks,
  PHASES,
  playbookCategories,
  playbookCategoryCounts,
  type Phase,
  type TemplateSort,
  type TemplateView,
} from "./playbook-model";
import { useAutomationBuilderResources } from "./use-automation-builder-resources";
import { usePlaybookFavorites } from "./use-playbook-favorites";

type WorkspaceSettingsDefaults = {
  id: string;
  timezone: string;
  approvalDefault: boolean;
};

export function useAutomationBuilder() {
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
  const { favoriteTemplateIds, toggleFavorite } = usePlaybookFavorites();
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

  const {
    collections,
    collectionAssets,
    collectionsLoading,
    sourceFile,
    sourceFileLoading,
    integrationStatuses,
    integrationsLoading,
    integrationsError,
    refreshIntegrations,
  } = useAutomationBuilderResources({
    editId,
    sourceFileId: record.content.sourceFileId ?? null,
    setError,
  });

  useEffect(() => {
    setPreviewSlide((current) =>
      Math.min(current, Math.max(0, record.content.slideCount - 1))
    );
  }, [record.content.slideCount]);

  useEffect(() => {
    if (editId) return;
    let cancelled = false;
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
    return () => {
      cancelled = true;
    };
  }, [editId]);

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

  const templateCategories = useMemo(() => playbookCategories(), []);
  const templateCategoryCounts = useMemo(
    () => playbookCategoryCounts(favoriteTemplateIds),
    [favoriteTemplateIds]
  );
  const templates = useMemo(
    () =>
      filterPlaybooks({
        search: templateSearch,
        category: templateCategory,
        sort: templateSort,
        favoriteTemplateIds,
      }),
    [favoriteTemplateIds, templateCategory, templateSearch, templateSort]
  );

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
  const phaseIndex = PHASES.indexOf(phase);
  const slideCopy = [record.hook.selected, record.content.structure, "One concrete point per slide", record.content.guidance, record.cta.style];
  const socialApprovalMissing =
    isAutomationSocialDestination(record.destination) &&
    !record.approvalRequired;

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  function applyTemplate(templateId: string) {
    setRecord((current) => applyPlaybookToRecord(current, templateId));
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
    setRecord((current) => ({
      ...current,
      ...destinationSelectionPatch(current, destination, integrationStatuses),
    }));
  }

  async function persist(mode: "draft" | "create") {
    const prepared = preparePlanSave({
      record,
      mode,
      integrationStatuses,
    });
    if (!prepared.ok) {
      setError(prepared.error);
      return;
    }
    setSaving(true);
    setSaveFailed(false);
    setError(null);
    const next = prepared.record;
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

  return {
    record,
    setRecord,
    phase,
    setPhase,
    phaseIndex,
    templateOpen,
    setTemplateOpen,
    templateSearch,
    setTemplateSearch,
    templateCategory,
    setTemplateCategory,
    templateSort,
    setTemplateSort,
    templateView,
    setTemplateView,
    favoriteTemplateIds,
    saving,
    saveFailed,
    savedRecordSignature,
    loading,
    validationOpen,
    setValidationOpen,
    error,
    setError,
    toast,
    previewSlide,
    setPreviewSlide,
    previewZoom,
    setPreviewZoom,
    collections,
    collectionsLoading,
    sourceFile,
    sourceFileLoading,
    integrationStatuses,
    integrationsLoading,
    integrationsError,
    refreshIntegrations,
    templateCategories,
    templateCategoryCounts,
    templates,
    previewTemplate,
    selectedTemplate,
    selectedTemplateId,
    setPreviewTemplateId,
    previewAsset,
    previewEmptyCopy,
    recordSignature,
    destinationReadiness,
    saveStatus,
    slideCopy,
    socialApprovalMissing,
    applyTemplate,
    openTemplatePicker,
    selectTemplate,
    toggleFavorite,
    updateHook,
    updateContent,
    updateCta,
    toggleDay,
    selectDestination,
    persist,
    PHASES,
    DAYS,
  };
}

export type AutomationBuilderWorkspace = ReturnType<typeof useAutomationBuilder>;

