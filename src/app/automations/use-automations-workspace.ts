"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SlideshowAutomation } from "@/components/slideshow/types";
import {
  isAutomationExecutionEnabled,
  isAutomationRecord,
  type AutomationRecord,
} from "@/lib/automations";
import type { PublicIntegrationStatus } from "@/lib/integrations/types";
import {
  deleteSlideshowAutomation,
  updateSlideshowAutomationStatus,
} from "@/lib/slideshow/client";
import {
  automationNeedsAttention,
  type AutomationHubFilter,
} from "./hub-status";
import {
  deleteAutomationRecord,
  duplicateAutomationRecord,
  loadAutomationsPageSnapshot,
  postLocalSchedule,
  postReviewDraft,
} from "./video-automation-api";
import { useVideoPublish } from "./use-video-publish";

export function useAutomationsWorkspace() {
  const router = useRouter();
  const [records, setRecords] = useState<AutomationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AutomationHubFilter>("All");
  const [menu, setMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [integrationStatuses, setIntegrationStatuses] = useState<
    PublicIntegrationStatus[]
  >([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [slideshowAutomations, setSlideshowAutomations] = useState<
    SlideshowAutomation[]
  >([]);
  const [slideshowError, setSlideshowError] = useState<string | null>(null);
  const [slideshowDeleteId, setSlideshowDeleteId] = useState<string | null>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1700);
  }, []);

  const publish = useVideoPublish({
    setRecords,
    setBusy,
    setMenu,
    setError,
    notify,
  });
  async function load() {
    setLoading(true);
    setIntegrationsLoading(true);
    setError(null);
    setIntegrationsError(null);
    setSlideshowError(null);
    const snapshot = await loadAutomationsPageSnapshot();
    setRecords(snapshot.records);
    setError(snapshot.recordsError);
    setSlideshowAutomations(snapshot.slideshow);
    setSlideshowError(snapshot.slideshowError);
    setIntegrationStatuses(snapshot.providers);
    setIntegrationsError(snapshot.providersError);
    setLoading(false);
    setIntegrationsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      records.filter((record) => {
        if (filter === "All") return true;
        if (filter === "Ready plans") {
          return (
            (record.status === "active" || record.status === "paused") &&
            !automationNeedsAttention(
              record,
              integrationStatuses,
              integrationsLoading
            )
          );
        }
        if (filter === "Drafts") return record.status === "draft";
        return automationNeedsAttention(
          record,
          integrationStatuses,
          integrationsLoading
        );
      }),
    [records, filter, integrationStatuses, integrationsLoading]
  );

  async function toggleSlideshow(automation: SlideshowAutomation) {
    const status = automation.status === "active" ? "paused" : "active";
    setBusy(automation.id);
    setSlideshowAutomations((current) =>
      current.map((item) => (item.id === automation.id ? { ...item, status } : item))
    );
    try {
      const saved = await updateSlideshowAutomationStatus(automation, status);
      setSlideshowAutomations((current) =>
        current.map((item) => (item.id === automation.id ? saved : item))
      );
      notify(
        status === "active"
          ? `${automation.name} resumed`
          : `${automation.name} paused`
      );
    } catch (cause) {
      setSlideshowAutomations((current) =>
        current.map((item) => (item.id === automation.id ? automation : item))
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
        current.filter((item) => item.id !== automation.id)
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
    setBusy(record.id);
    setMenu(null);
    try {
      setRecords(await duplicateAutomationRecord(record));
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
      setRecords(await postLocalSchedule(record.id, action));
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
    if (
      !window.confirm(
        `Delete ${record.name}? Existing generated media will stay in Gallery.`
      )
    )
      return;
    setBusy(record.id);
    try {
      setRecords(await deleteAutomationRecord(record.id));
      notify("Automation deleted");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to delete automation"
      );
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
      const body = await postReviewDraft(record);
      if (body.automation && isAutomationRecord(body.automation)) {
        setRecords((current) =>
          current.map((candidate) =>
            candidate.id === body.automation?.id
              ? (body.automation as AutomationRecord)
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
  const scheduledDays = new Set(
    records.flatMap((record) => record.schedule.days)
  ).size;

  return {
    records,
    filtered,
    loading,
    error,
    filter,
    setFilter,
    menu,
    setMenu,
    busy,
    toast,
    integrationStatuses,
    integrationsLoading,
    integrationsError,
    ...publish,
    slideshowAutomations,
    slideshowError,
    slideshowDeleteId,
    setSlideshowDeleteId,
    load,
    toggleSlideshow,
    removeSlideshow,
    duplicate,
    changeLocalSchedule,
    remove,
    generateReviewDraft,
    readyPlanCount,
    attentionCount,
    activeScheduleCount,
    scheduledDays,
  };
}

export type AutomationsWorkspace = ReturnType<typeof useAutomationsWorkspace>;
