"use client";

import { Button, KeyValueList, StatusChip } from "@/components/workbench";

import type { SlideshowPublishWorkspace } from "./view-models";

export function PublishSidebar({
  publish,
}: {
  publish: SlideshowPublishWorkspace;
}) {
  const {
    project,
    tiktokConnected,
    format,
    formatBlocked,
    destinationBlocked,
    error,
    exported,
  } = publish;
  return (
    <aside
      aria-label="Summary"
      className="flex w-full shrink-0 flex-col gap-3.5 rounded-lg bg-raised p-4 md:w-[280px]"
    >
      <div className="flex flex-col items-start gap-2.5">
        {tiktokConnected ? (
          <StatusChip tone="ok" icon="check">TikTok connected</StatusChip>
        ) : (
          <>
            <StatusChip tone="warn" icon="alert">TikTok not connected</StatusChip>
            <Button size={32} disabled className="disabled:bg-raised-strong">
              Connect account
            </Button>
          </>
        )}
      </div>

      <KeyValueList
        rows={[
          { label: "Slides", value: project.slides.length },
          { label: "Ratio", value: project.aspectRatio },
          {
            label: "Format",
            value: format === "photo-carousel" ? "Photo carousel" : "MP4",
          },
        ]}
      />

      {formatBlocked ? (
        <p className="wb-notice" data-tone="warn">
          <span>
            <strong className="font-semibold text-warn">MP4 is off.</strong> It needs a
            video renderer.
          </span>
        </p>
      ) : null}
      {destinationBlocked ? (
        <p className="wb-notice" data-tone="warn">
          <span>
            <strong className="font-semibold text-warn">TikTok publishing is off.</strong>{" "}
            Connect an account with posting scope. Download still works.
          </span>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="wb-notice" data-tone="bad">
          <strong>{error}</strong>
        </p>
      ) : null}
      {exported ? (
        <p role="status" className="wb-notice" data-tone="ok">
          <strong>Slideshow prepared.</strong>
        </p>
      ) : null}
    </aside>
  );
}
