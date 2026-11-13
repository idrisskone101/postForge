"use client";

import { Icon } from "@/components/workbench";
import { unicodeCodePointLength } from "@/lib/unicode";
import type { PublishDialogState } from "./hub-types";
import { CheckControl, FieldLabel, publishLinkClass } from "./publish-dialog-controls";

export function PublishDialogYoutubeFields({
  state,
  descriptionBytes,
  onChange,
}: {
  state: PublishDialogState;
  descriptionBytes: number;
  onChange: (next: PublishDialogState) => void;
}) {
  return (
    <>
      <p className="wb-notice min-w-0 break-words [overflow-wrap:anywhere]" data-tone="warn">
        This upload includes YouTube&apos;s synthetic-media disclosure. Unverified API projects may force uploads to private; the saved record will show YouTube&apos;s actual privacy response.
      </p>
      <FieldLabel
        label="Short title"
        detail={`${unicodeCodePointLength(state.youtubeTitle)}/100`}
        mono
      >
        {(id) => (
          <input
            id={id}
            value={state.youtubeTitle}
            onChange={(event) => onChange({ ...state, youtubeTitle: event.target.value })}
            className="wb-input"
          />
        )}
      </FieldLabel>
      <FieldLabel label="Description" detail={`${descriptionBytes}/5000 UTF-8 bytes`} mono>
        {(id) => (
          <textarea
            id={id}
            value={state.youtubeDescription}
            onChange={(event) =>
              onChange({ ...state, youtubeDescription: event.target.value })
            }
            className="wb-input min-h-28"
          />
        )}
      </FieldLabel>
      <FieldLabel label="Visibility" detail="Choose one; no default is assumed">
        {(id) => (
          <select
            id={id}
            value={state.youtubePrivacy}
            onChange={(event) =>
              onChange({
                ...state,
                youtubePrivacy: event.target.value as "" | "private" | "unlisted" | "public",
              })
            }
            className="wb-input"
          >
            <option value="">Select YouTube visibility</option>
            <option value="private">Private</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
        )}
      </FieldLabel>
      <FieldLabel label="Audience" detail="Required by YouTube; no default is assumed">
        {(id) => (
          <select
            id={id}
            value={state.youtubeAudience}
            onChange={(event) =>
              onChange({
                ...state,
                youtubeAudience: event.target.value as
                  | ""
                  | "made_for_kids"
                  | "not_made_for_kids",
              })
            }
            className="wb-input"
          >
            <option value="">Select whether this video is made for kids</option>
            <option value="made_for_kids">Yes, it&apos;s made for kids</option>
            <option value="not_made_for_kids">No, it&apos;s not made for kids</option>
          </select>
        )}
      </FieldLabel>
      <CheckControl
        className="border-t border-hairline pt-3"
        label="I certify this upload complies with YouTube Community Guidelines"
        checked={state.youtubeGuidelinesConfirmed}
        onChange={(checked) => onChange({ ...state, youtubeGuidelinesConfirmed: checked })}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <a
            href="https://www.youtube.com/howyoutubeworks/policies/community-guidelines/"
            target="_blank"
            rel="noreferrer"
            className={publishLinkClass}
          >
            Review YouTube Community Guidelines
            <Icon name="link" size={14} className="shrink-0" />
          </a>
          <p className="min-w-0 break-words text-[13px] leading-[18px] text-fg-muted [overflow-wrap:anywhere]">
            By uploading, you agree to the{" "}
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-fg underline decoration-1 underline-offset-4"
            >
              YouTube Terms
            </a>
            .
          </p>
        </div>
      </CheckControl>
    </>
  );
}
