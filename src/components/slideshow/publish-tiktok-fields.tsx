"use client";

import { CalendarClock, MessageCircle } from "lucide-react";

import { Switch } from "@/components/ui/switch";

import type { SlideshowPublishOptions } from "./types";

const VISIBILITY_OPTIONS = ["public", "friends", "private"] as const;

function parseVisibility(
  value: string,
): SlideshowPublishOptions["visibility"] {
  for (const option of VISIBILITY_OPTIONS) {
    if (option === value) return option;
  }
  return "public";
}

export function PublishTikTokFields({
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
}: {
  publishingToTikTok: boolean;
  visibility: SlideshowPublishOptions["visibility"];
  onVisibilityChange: (value: SlideshowPublishOptions["visibility"]) => void;
  scheduledFor: string;
  onScheduledForChange: (value: string) => void;
  scheduleEnabled: boolean;
  onScheduleEnabledChange: (value: boolean) => void;
  allowComments: boolean;
  onAllowCommentsChange: (value: boolean) => void;
  allowDuet: boolean;
  onAllowDuetChange: (value: boolean) => void;
  allowStitch: boolean;
  onAllowStitchChange: (value: boolean) => void;
  brandedContent: boolean;
  onBrandedContentChange: (value: boolean) => void;
  aiGenerated: boolean;
  onAiGeneratedChange: (value: boolean) => void;
}) {
  if (!publishingToTikTok) return null;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold">Visibility</span>
          <select
            value={visibility}
            onChange={(event) => onVisibilityChange(parseVisibility(event.target.value))}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent-blue"
          >
            <option value="public">Everyone</option>
            <option value="friends">Friends</option>
            <option value="private">Only me</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold">Schedule</span>
          <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3">
            <CalendarClock className="size-4 text-muted-foreground" />
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => onScheduledForChange(event.target.value)}
              disabled={!scheduleEnabled}
              className="min-w-0 flex-1 bg-transparent text-[11px] outline-none disabled:opacity-40"
            />
            <Switch
              size="sm"
              checked={scheduleEnabled}
              onCheckedChange={onScheduleEnabledChange}
              aria-label="Schedule publishing"
            />
          </div>
        </label>
      </div>

      <div className="grid gap-3 rounded-[6px] border border-border p-4 sm:grid-cols-3">
        <label className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-2">
            <MessageCircle className="size-3.5 text-muted-foreground" />
            Comments
          </span>
          <Switch
            size="sm"
            checked={allowComments}
            onCheckedChange={onAllowCommentsChange}
            aria-label="Allow comments"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-xs">
          <span>Duet</span>
          <Switch
            size="sm"
            checked={allowDuet}
            onCheckedChange={onAllowDuetChange}
            aria-label="Allow duet"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-xs">
          <span>Stitch</span>
          <Switch
            size="sm"
            checked={allowStitch}
            onCheckedChange={onAllowStitchChange}
            aria-label="Allow stitch"
          />
        </label>
      </div>

      <div className="space-y-3 rounded-[6px] border border-border p-4">
        <label className="flex items-center justify-between gap-4 text-xs">
          <span>
            <span className="block font-semibold">Branded content</span>
            <span className="mt-1 block text-[12px] text-muted-foreground">
              Disclose promotional or paid content.
            </span>
          </span>
          <Switch
            checked={brandedContent}
            onCheckedChange={onBrandedContentChange}
            aria-label="Disclose branded content"
          />
        </label>
        <label className="flex items-center justify-between gap-4 border-t border-border pt-3 text-xs">
          <span>
            <span className="block font-semibold">AI-generated content</span>
            <span className="mt-1 block text-[12px] text-muted-foreground">
              Apply TikTok&apos;s AI content disclosure.
            </span>
          </span>
          <Switch
            checked={aiGenerated}
            onCheckedChange={onAiGeneratedChange}
            aria-label="Disclose AI generated content"
          />
        </label>
      </div>
    </>
  );
}
