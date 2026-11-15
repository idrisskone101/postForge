"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
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

export function useAutomationsWorkspace(initialRecords: AutomationRecord[] = []) {
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [records, setRecords] = useState<AutomationRecord[]>(initialRecords);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AutomationHubFilter>("All");
  const [menu, setMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<HubToast | null>(null);
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
    setToast({ id: `ok-${Date.now()}`, tone: "ok", message });
  }, []);
  const reportActionError = useCallback((message: string | null) => {
    if (message) {
      setToast({ id: `bad-${Date.now()}`, tone: "bad", message });
    } else {
      setToast((current) => (current?.tone === "bad" ? null : current));
    }
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToast((current) => (current?.id === id ? null : current));
  }, []);

  const publish = useVideoPublish({
    setRecords,
    setBusy,
    setMenu,
    setError: reportActionError,
    notify,
  });
  async function load() {
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
      reportActionError(
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
      reportActionError(
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
      reportActionError(
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
    reportActionError(null);
    try {
      setRecords(await postLocalSchedule(record.id, action));
      notify(
        action === "activate"
          ? "Local review-draft schedule activated"
          : "Local review-draft schedule paused"
      );
    } catch (cause) {
      reportActionError(
        cause instanceof Error
          ? cause.message
          : "Unable to update the local schedule"
      );
    } finally {
      setBusy(null);
    }
  }

  async function remove(record: AutomationRecord) {
    // The menu closes first, and its row's Actions button becomes the place focus returns to.
    setMenu(null);
    document
      .querySelector<HTMLElement>(
        `[data-automation-row=${JSON.stringify(record.id)}] [aria-label^="Actions for"]`
      )
      ?.focus({ preventScroll: true });
    const confirmed = await confirm({
      title: `Delete ${record.name}?`,
      body: "Existing generated media will stay in Gallery.",
      confirmLabel: "Delete automation",
    });
    if (confirmed !== true) return;
    setBusy(record.id);
    try {
      setRecords(await deleteAutomationRecord(record.id));
      notify("Automation deleted");
    } catch (cause) {
      reportActionError(
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
    reportActionError(null);
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
      reportActionError(
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
  const carouselSchedules = slideshowAutomations.filter(
    (automation) => automation.status !== "archived"
  );
  const activeCarouselSchedules = carouselSchedules.filter(
    (automation) => automation.status === "active"
  );
  const planCount = records.length + carouselSchedules.length;
  const calendarEntries = [
    ...records.map((record) => ({
      id: record.id,
      name: record.name,
      time: record.schedule.time,
      days: record.schedule.days,
      needsAttention: automationNeedsAttention(
        record,
        integrationStatuses,
        integrationsLoading
      ),
    })),
    ...activeCarouselSchedules
      .filter((automation) => automation.weekdays?.length && automation.time)
      .map((automation) => ({
        id: automation.id,
        name: automation.name,
        time: automation.time ?? "",
        days: automation.weekdays ?? [],
        needsAttention: false,
      })),
  ];

  return {
    confirmDialog,
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
    dismissToast,
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
    readyPlanCount: readyPlanCount + activeCarouselSchedules.length,
    planCount,
    attentionCount,
    activeScheduleCount,
    calendarEntries,
  };
}

export type HubToast = { id: string; tone: "ok" | "bad"; message: string };

export type AutomationsWorkspace = ReturnType<typeof useAutomationsWorkspace>;
