"use client";

import { Toggle } from "@/components/workbench";

import type { SlideshowPublishWorkspace } from "./view-models";

export function PublishTikTokFields({
  publish,
}: {
  publish: SlideshowPublishWorkspace;
}) {
  const {
    publishingToTikTok,
    visibility,
    onVisibilityChange,
    scheduledFor,
    onScheduledForChange,
    scheduleEnabled,
    onScheduleEnabledChange,
    allowComments,
    onAllowCommentsChange,
    allowDuet,
    onAllowDuetChange,
    allowStitch,
    onAllowStitchChange,
    brandedContent,
    onBrandedContentChange,
    aiGenerated,
    onAiGeneratedChange,
  } = publish;
  if (!publishingToTikTok) return null;
  const switches = [
    ["Allow comments", "Allow comments", allowComments, onAllowCommentsChange],
    ["Allow duet", "Allow duet", allowDuet, onAllowDuetChange],
    ["Allow stitch", "Allow stitch", allowStitch, onAllowStitchChange],
    ["Branded content", "Disclose branded content", brandedContent, onBrandedContentChange],
    [
      "AI-generated content",
      "Disclose AI generated content",
      aiGenerated,
      onAiGeneratedChange,
    ],
  ] as const;
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-3.5 sm:flex-row sm:gap-2.5">
        <div className="wb-field flex-1">
          <label className="wb-label" htmlFor="slideshow-publish-visibility">
            Visibility
          </label>
          <select
            id="slideshow-publish-visibility"
            value={visibility}
            onChange={(event) => onVisibilityChange(parseVisibility(event.target.value))}
            className="wb-input"
          >
            <option value="public">Everyone</option>
            <option value="friends">Friends</option>
            <option value="private">Only me</option>
          </select>
        </div>
        <div className="wb-field flex-1">
          <label className="wb-label" htmlFor="slideshow-publish-schedule">
            Schedule
          </label>
          <div className="flex items-center gap-2.5">
            <input
              id="slideshow-publish-schedule"
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => onScheduledForChange(event.target.value)}
              disabled={!scheduleEnabled}
              data-mono="true"
              className="wb-input flex-1"
            />
            <Toggle
              checked={scheduleEnabled}
              onCheckedChange={onScheduleEnabledChange}
              label="Schedule publishing"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        {switches.map(([text, ariaLabel, checked, onChange]) => (
          <label
            key={ariaLabel}
            className="flex min-h-11 cursor-pointer items-center justify-between gap-4 border-b border-hairline text-[14px] leading-5 font-medium text-fg last:border-b-0"
          >
            {text}
            <Toggle checked={checked} onCheckedChange={onChange} label={ariaLabel} />
          </label>
        ))}
      </div>
    </div>
  );
}

const VISIBILITY_OPTIONS = ["public", "friends", "private"] as const;

function parseVisibility(
  value: string,
): SlideshowPublishWorkspace["visibility"] {
  for (const option of VISIBILITY_OPTIONS) {
    if (option === value) return option;
  }
  return "public";
}
