"use client";

import Link from "next/link";
import {
  Button,
  EmptyState,
  Skeleton,
  Toast,
  buttonClass,
} from "@/components/workbench";
import type { AutomationRecord } from "@/lib/automations";
import { HubOverview } from "./hub-overview";
import { ManualResolutionDialog } from "./manual-resolution-dialog";
import { PlanningCalendar } from "./planning-calendar";
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
    toast,
    publishDialog,
    setPublishDialog,
    manualResolutionDialog,
    setManualResolutionDialog,
    load,
    submitPublication,
    resolveUnknownPublication,
    busy,
  } = hub;
  const firstLoad = integrationsLoading && records.length === 0 && !error;

  return (
    <div data-automations-hub="true" className="flex min-h-0 flex-1 flex-col gap-3">
      {error && (
        <div role="alert" className="wb-notice shrink-0" data-tone="bad">
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            <strong>Automations did not load.</strong> {error}
          </span>
          <Button size={32} onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {firstLoad ? (
        <HubSkeleton />
      ) : records.length === 0 ? (
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
          <div className="flex min-h-0 flex-1 flex-col gap-3 xl:flex-row">
            <VideoAutomationList hub={hub} />
            <SlideshowAutomationList hub={hub} />
          </div>
        </div>
      )}

      {toast && (
        <div className="wb-toast-region">
          <Toast toast={{ id: toast, tone: "ok", message: toast }} onDismiss={keepToast} />
        </div>
      )}

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

function HubSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading automations" className="flex min-h-0 flex-1 flex-col gap-3">
      <Skeleton shape="panel" className="h-[98px] shrink-0" />
      <Skeleton shape="panel" className="h-[212px] shrink-0" />
      <div className="flex min-h-[320px] flex-1 flex-col gap-3 xl:flex-row">
        <Skeleton shape="panel" className="min-h-[240px] flex-1" />
        <Skeleton shape="panel" className="min-h-[240px] xl:w-[340px]" />
      </div>
    </div>
  );
}

// The hub clears its own toast after 1.7s; the primitive's dismiss has nothing left to remove.
function keepToast() {}
