"use client";

import { CircleAlert, Loader2, Send, X } from "lucide-react";
import type { PublishDialogState } from "./hub-types";
import { canSubmitPublishReview } from "./publish-dialog-model";
import { CheckControl, FieldLabel } from "./publish-dialog-controls";
import { PublishDialogTiktokFields } from "./publish-dialog-tiktok";
import { PublishDialogYoutubeFields } from "./publish-dialog-youtube";

export function PublishReviewDialog({
  state,
  busy,
  onChange,
  onClose,
  onPublish,
}: {
  state: PublishDialogState;
  busy: boolean;
  onChange: (next: PublishDialogState) => void;
  onClose: () => void;
  onPublish: () => void;
}) {
  const providerName =
    state.preflight.provider === "youtube"
      ? "YouTube Shorts"
      : state.preflight.provider === "instagram"
        ? "Instagram Reels"
        : "TikTok";
  const accountName =
    state.preflight.account.displayName ||
    state.preflight.account.username ||
    state.preflight.account.id;
  const descriptionBytes = new TextEncoder().encode(
    state.youtubeDescription
  ).length;
  const canPublish = canSubmitPublishReview(state);
  const creator = state.preflight.creator;

  return (
    <div
      className="pf-safe-overlay fixed inset-0 z-[90] grid min-w-0 place-items-center overflow-y-auto bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-review-title"
    >
      <div className="flex max-h-full w-full min-w-0 max-w-[760px] flex-col overflow-hidden rounded-[12px] border border-border bg-card shadow-2xl sm:rounded-[12px]">
        <header className="flex min-w-0 shrink-0 items-start justify-between gap-3 border-b border-border bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2
              id="publish-review-title"
              className="mt-1 min-w-0 break-words text-[15px] font-semibold tracking-[-0.035em] [overflow-wrap:anywhere]"
            >
              Publish {state.recordName} to {providerName}
            </h2>
            <p className="mt-1 min-w-0 break-words text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
              Connected account: {accountName}
              {state.preflight.account.username
                ? ` (@${state.preflight.account.username.replace(/^@/, "")})`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-[var(--pf-active)] disabled:opacity-40"
            aria-label="Close publishing review"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="grid min-h-0 min-w-0 flex-1 overflow-y-auto md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="min-w-0 border-b border-border bg-[var(--pf-active)] p-4 md:border-b-0 md:border-r">
            <div className="mx-auto w-full max-w-[210px] overflow-hidden rounded-lg bg-black shadow-lg">
              <video
                src={state.preflight.asset.previewUrl}
                controls
                preload="metadata"
                className="aspect-[9/16] max-h-[42dvh] w-full object-contain md:max-h-[390px]"
              />
            </div>
            <p className="mx-auto mt-3 max-w-[210px] min-w-0 break-words text-[12px] leading-4 text-muted-foreground [overflow-wrap:anywhere] dark:text-[var(--pf-muted)]">
              <b className="block text-[11px] text-foreground">
                Approved Gallery output
              </b>
              {state.preflight.asset.filename}
              {state.preflight.asset.width && state.preflight.asset.height
                ? ` · ${state.preflight.asset.width}×${state.preflight.asset.height}`
                : ""}
              {state.preflight.asset.durationSec
                ? ` · ${Math.round(state.preflight.asset.durationSec)}s`
                : ""}
            </p>
          </aside>

          <section className="min-w-0 space-y-4 p-4 sm:p-5">
            {state.error && (
              <div
                role="alert"
                className="flex min-w-0 items-start gap-2 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 p-3 text-[11px] leading-4 text-[var(--pf-danger)]"
              >
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                  {state.error}
                </span>
              </div>
            )}
            {state.preflight.provider === "tiktok" && creator && (
              <PublishDialogTiktokFields
                state={state}
                creator={creator}
                onChange={onChange}
              />
            )}

            {state.preflight.provider === "instagram" && (
              <>
                <div className="rounded-lg border border-border bg-card p-3 text-[11px] leading-4 text-muted-foreground">
                  Instagram Reels are public media. Instagram must fetch this approved video from a short-lived signed URL before publishing.
                </div>
                <FieldLabel label="Reel caption" detail={`${state.caption.length}/2200`}>
                  <textarea
                    value={state.caption}
                    maxLength={2200}
                    onChange={(event) =>
                      onChange({ ...state, caption: event.target.value })
                    }
                    className="min-h-28 w-full min-w-0 resize-y rounded-lg border border-border bg-white px-3 py-2 text-[11px] outline-none focus:border-[var(--pf-orange)]"
                  />
                </FieldLabel>
              </>
            )}

            {state.preflight.provider === "youtube" && (
              <PublishDialogYoutubeFields
                state={state}
                descriptionBytes={descriptionBytes}
                onChange={onChange}
              />
            )}

            <div className="min-w-0 rounded-lg border border-border bg-white p-3">
              <CheckControl
                label={`Publish this exact approved video to ${providerName} now`}
                checked={state.consent}
                onChange={(checked) => onChange({ ...state, consent: checked })}
              />
              <p className="mt-2 min-w-0 break-words text-[12px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">
                This is an external mutation. The scheduler will not repeat it. Provider acceptance, processing, failures, and retry state are persisted to this workflow.
              </p>
            </div>
          </section>
        </div>

        <footer className="flex min-w-0 shrink-0 flex-col-reverse gap-2 border-t border-border bg-white px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="min-w-0 break-words text-[12px] text-muted-foreground [overflow-wrap:anywhere]">
            {state.retryFailed
              ? "This creates a new explicit attempt for the same approved asset."
              : "Nothing is sent until you confirm this review."}
          </p>
          <div className="flex shrink-0 flex-col-reverse gap-2 min-[420px]:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="pf-button-secondary justify-center disabled:opacity-45"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onPublish}
              disabled={busy || !canPublish}
              className="pf-button-primary justify-center disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              {state.retryFailed ? "Retry publish" : "Publish now"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
