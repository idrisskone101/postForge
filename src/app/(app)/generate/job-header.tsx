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
      <header
        className="wb-page-header flex-nowrap pr-1 max-lg:grid max-lg:grid-cols-[minmax(0,1fr)_auto] max-lg:gap-y-2"
        data-back="true"
      >
        <div className="wb-page-header-lead max-lg:contents">
          <button
            type="button"
            onClick={actions.onBack}
            className="wb-btn wb-btn-40 wb-back-pill flex-none justify-self-start gap-1.5 pl-2.5"
          >
            <Icon name="chevron-left" />
            Back
          </button>
          <h1
            className="wb-page-title line-clamp-2 min-w-0 whitespace-normal pl-2 [overflow-wrap:anywhere] max-lg:col-span-2 max-lg:row-start-2 max-lg:min-h-16 max-lg:pl-1"
            title={getEditorTitle(job.prompt)}>
            {getEditorTitle(job.prompt)}
          </h1>
        </div>
        <div className="wb-page-actions flex-none">
          <Button size={40} onClick={actions.onShare}>
            <JobIcon name="share" />
            Share
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
