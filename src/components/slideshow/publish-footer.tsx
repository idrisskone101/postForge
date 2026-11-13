"use client";

import { Button, Icon } from "@/components/workbench";

import type { SlideshowPublishWorkspace } from "./view-models";

export function PublishFooter({
  publish,
  onCancel,
}: {
  publish: SlideshowPublishWorkspace;
  onCancel: () => void;
}) {
  const { canSubmit, exporting, onSubmit } = publish;
  const label = submitLabel(publish);
  const icon = submitIcon(publish);
  return (
    <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-hairline pt-4">
      <Button size={40} onClick={onCancel}>
        Cancel
      </Button>
      <Button
        variant="primary"
        size={40}
        onClick={() => void onSubmit()}
        disabled={!canSubmit}
        aria-busy={exporting || undefined}
      >
        <Icon name={icon} strokeWidth={2} />
        {label}
      </Button>
    </div>
  );
}

function submitLabel({
  exporting,
  destination,
  scheduleEnabled,
}: SlideshowPublishWorkspace) {
  if (exporting) return "Preparing";
  if (destination === "download") return "Export slideshow";
  if (scheduleEnabled) return "Schedule slideshow";
  return destination === "tiktok-draft" ? "Send to TikTok drafts" : "Publish to TikTok";
}

function submitIcon({ destination, scheduleEnabled }: SlideshowPublishWorkspace) {
  if (destination === "download") return "download";
  return scheduleEnabled ? "clock" : "upload";
}
