"use client";

import { ExternalLink } from "lucide-react";
import { unicodeCodePointLength } from "@/lib/unicode";
import type { PublishDialogState } from "./hub-types";
import { CheckControl, FieldLabel } from "./publish-dialog-controls";

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
                <div className="rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 p-3 text-[11px] leading-4 text-[var(--pf-danger)]">
                  This upload includes YouTube&apos;s synthetic-media disclosure. Unverified API projects may force uploads to private; the saved record will show YouTube&apos;s actual privacy response.
                </div>
                <FieldLabel
                  label="Short title"
                  detail={`${unicodeCodePointLength(state.youtubeTitle)}/100`}
                >
                  <input
                    value={state.youtubeTitle}
                    onChange={(event) =>
                      onChange({ ...state, youtubeTitle: event.target.value })
                    }
                    className="h-10 w-full min-w-0 rounded-lg border border-border bg-[var(--pf-surface)] px-3 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                  />
                </FieldLabel>
                <FieldLabel
                  label="Description"
                  detail={`${descriptionBytes}/5000 UTF-8 bytes`}
                >
                  <textarea
                    value={state.youtubeDescription}
                    onChange={(event) =>
                      onChange({ ...state, youtubeDescription: event.target.value })
                    }
                    className="min-h-28 w-full min-w-0 resize-y rounded-lg border border-border bg-[var(--pf-surface)] px-3 py-2 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                  />
                </FieldLabel>
                <FieldLabel label="Visibility" detail="Choose one; no default is assumed">
                  <select
                    value={state.youtubePrivacy}
                    onChange={(event) =>
                      onChange({
                        ...state,
                        youtubePrivacy: event.target.value as
                          | ""
                          | "private"
                          | "unlisted"
                          | "public",
                      })
                    }
                    className="h-10 w-full min-w-0 rounded-lg border border-border bg-[var(--pf-surface)] px-3 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                  >
                    <option value="">Select YouTube visibility</option>
                    <option value="private">Private</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="public">Public</option>
                  </select>
                </FieldLabel>
                <FieldLabel
                  label="Audience"
                  detail="Required by YouTube; no default is assumed"
                >
                  <select
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
                    className="h-10 w-full min-w-0 rounded-lg border border-border bg-[var(--pf-surface)] px-3 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                  >
                    <option value="">Select whether this video is made for kids</option>
                    <option value="made_for_kids">Yes, it&apos;s made for kids</option>
                    <option value="not_made_for_kids">No, it&apos;s not made for kids</option>
                  </select>
                </FieldLabel>
                <div className="min-w-0 rounded-lg border border-border bg-[var(--pf-surface)] p-3">
                  <CheckControl
                    label="I certify this upload complies with YouTube Community Guidelines"
                    checked={state.youtubeGuidelinesConfirmed}
                    onChange={(checked) =>
                      onChange({
                        ...state,
                        youtubeGuidelinesConfirmed: checked,
                      })
                    }
                  />
                  <a
                    href="https://www.youtube.com/howyoutubeworks/policies/community-guidelines/"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex min-w-0 items-center gap-1 break-words text-[12px] font-semibold text-[var(--pf-orange)] underline [overflow-wrap:anywhere] dark:text-[var(--pf-orange)]"
                  >
                    Review YouTube Community Guidelines
                    <ExternalLink className="size-2.5 shrink-0" />
                  </a>
                  <p className="mt-2 min-w-0 break-words text-[12px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">
                    By uploading, you agree to the{" "}
                    <a
                      href="https://www.youtube.com/t/terms"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[var(--pf-orange)] underline dark:text-[var(--pf-orange)]"
                    >
                      YouTube Terms
                    </a>
                    .
                  </p>
                </div>
              </>

  );
}
