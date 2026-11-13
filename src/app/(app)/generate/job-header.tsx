"use client";

import { Button, Icon } from "@/components/workbench";
import { JobIcon } from "./job-icons";
import { getEditorTitle, type JobDetailActions, type JobDetailViewModel } from "./job-enhancements";

export function JobDetailHeader({
  view,
  actions,
}: {
  view: JobDetailViewModel;
  actions: JobDetailActions;
}) {
  const { job, error } = view;
  return (
    <>
      <header className="wb-page-header flex-nowrap" data-back="true">
        <div className="wb-page-header-lead">
          <button
            type="button"
            onClick={actions.onBack}
            className="wb-btn wb-btn-40 wb-back-pill flex-none pl-2.5"
          >
            <Icon name="chevron-left" />
            Back
          </button>
          <h1 className="wb-page-title pl-2" title={job.prompt}>
            {getEditorTitle(job.prompt)}
          </h1>
        </div>
        <div className="wb-page-actions flex-none">
          <Button size={40} aria-label="Share" onClick={actions.onShare} className="max-sm:w-10 max-sm:px-0">
            <JobIcon name="share" />
            <span className="max-sm:hidden">Share</span>
          </Button>
        </div>
      </header>

      {error && (
        <div role="alert" className="wb-notice flex-none items-start" data-tone="bad">
          <Icon name="alert" size={16} className="mt-px flex-none text-bad" />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            <strong className="font-semibold text-bad">Live status could not refresh.</strong>{" "}
            {error.message}. Showing the last known state.
          </span>
        </div>
      )}
    </>
  );
}
