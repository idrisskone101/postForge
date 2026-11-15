"use client";

import Link from "next/link";
import {
  Button,
  EmptyState,
  Toast,
  buttonClass,
} from "@/components/workbench";
import type { AutomationRecord } from "@/lib/automations";
import { useLingering } from "@/lib/use-exit-presence";
import { HubOverview } from "./hub-overview";
import { HubSkeleton } from "./hub-skeleton";
import { ManualResolutionDialog } from "./manual-resolution-dialog";
import { PlanningCalendar } from "./planning-calendar";
import type { DialogPhase } from "./publish-dialog-controls";
import { PublishReviewDialog } from "./publish-review-dialog";
import { SlideshowAutomationList } from "./slideshow-automation-list";
import { useAutomationsWorkspace } from "./use-automations-workspace";
import { VideoAutomationList } from "./video-automation-list";

export function AutomationsPageClient({
  initialRecords,
}: {
  initialRecords: AutomationRecord[];
}) {
  const hub = useAutomationsWorkspace(initialRecords);
  const {
    records,
    error,
    integrationsLoading,
    integrationsError,
    slideshowAutomations,
    slideshowError,
    toast,
    dismissToast,
    publishDialog,
    setPublishDialog,
    manualResolutionDialog,
    setManualResolutionDialog,
    load,
    submitPublication,
    resolveUnknownPublication,
    busy,
  } = hub;
  const { value: publishState, leaving: publishLeaving } = useLingering(publishDialog);
  const { value: manualState, leaving: manualLeaving } = useLingering(manualResolutionDialog);
  const firstLoad = integrationsLoading && records.length === 0 && !error;
  const nothingSaved =
    records.length === 0 && slideshowAutomations.length === 0 && !slideshowError;

  return (
    <div data-automations-hub="true" className="flex min-h-0 flex-1 flex-col gap-3">
      {error && (
        <div role="alert" className="wb-notice shrink-0" data-tone="bad">
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            <strong className="font-semibold text-bad">Automations did not load.</strong> {error}
          </span>
          <Button size={32} onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {integrationsError && !integrationsLoading && (
        <div role="status" className="wb-notice shrink-0" data-tone="warn">
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            <strong className="font-semibold text-warn">Connection status unavailable.</strong> {integrationsError}
          </span>
          <Button size={32} onClick={load}>
            Check again
          </Button>
        </div>
      )}

      {firstLoad ? (
        <HubSkeleton />
      ) : nothingSaved ? (
        <section className="flex min-h-[420px] flex-1 flex-col rounded-xl bg-panel p-5 shadow-panel">
          <EmptyState
            icon="automations"
            title="No automations yet"
            detail="Plans save paused. Nothing publishes without your approval."
            className="flex-1"
          >
            <Link href="/automations/new" className={buttonClass("strong", 36)}>
              Choose a playbook
            </Link>
          </EmptyState>
        </section>
      ) : (
        <div className="wb-fade-in flex min-h-0 flex-1 flex-col gap-3">
          <HubOverview hub={hub} />
          <PlanningCalendar hub={hub} />
          <div className="flex min-h-0 flex-1 flex-col gap-3 min-[1380px]:flex-row">
            <VideoAutomationList hub={hub} />
            <SlideshowAutomationList hub={hub} />
          </div>
        </div>
      )}

      {toast && (
        <div className="wb-toast-region">
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        </div>
      )}

      {hub.confirmDialog}

      {publishState && (
        <PublishReviewDialog
          state={publishState}
          phase={dialogPhase(publishLeaving, busy === publishState.recordId)}
          onChange={(next) => setPublishDialog({ ...next, error: null })}
          onClose={() => setPublishDialog(null)}
          onPublish={submitPublication}
        />
      )}

      {manualState && (
        <ManualResolutionDialog
          state={manualState}
          phase={dialogPhase(manualLeaving, busy === manualState.record.id)}
          onClose={() => setManualResolutionDialog(null)}
          onConfirm={() => resolveUnknownPublication(manualState.record, manualState.resolution)}
        />
      )}
    </div>
  );
}

function dialogPhase(leaving: boolean, busy: boolean): DialogPhase {
  if (leaving) return "leaving";
  return busy ? "busy" : "open";
}
