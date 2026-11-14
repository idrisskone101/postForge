"use client";

import { Send } from "lucide-react";
import { createPortal } from "react-dom";
import { Button, Icon, IconButton, KeyValueList, type KeyValueRow } from "@/components/workbench";
import type { PublishDialogState } from "./hub-types";
import { canSubmitPublishReview } from "./publish-dialog-model";
import { CheckControl, FieldLabel, useDialogKeys } from "./publish-dialog-controls";
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
  const { preflight } = state;
  const dialogKeys = useDialogKeys({ recordId: state.recordId, busy, onClose });
  const providerName = PROVIDER_NAMES[preflight.provider];
  const accountName =
    preflight.account.displayName || preflight.account.username || preflight.account.id;
  const descriptionBytes = new TextEncoder().encode(state.youtubeDescription).length;
  const canPublish = canSubmitPublishReview(state);
  const creator = preflight.creator;

  return createPortal(
    <div
      className="pf-safe-overlay fixed inset-0 z-[90] grid min-w-0 place-items-center overflow-y-auto bg-[var(--pf-scrim)] outline-none [animation:wb-fade-in_var(--pf-dur-enter)_var(--pf-ease)_both]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-review-title"
      {...dialogKeys}
    >
      <div className="flex max-h-full w-full min-w-0 max-w-[820px] flex-col overflow-hidden rounded-xl bg-panel shadow-float [animation:wb-rise-in_var(--pf-dur-enter)_var(--pf-ease)_both]">
        <header className="flex min-w-0 shrink-0 items-start justify-between gap-3 px-4 pb-4 pt-5 sm:px-6">
          <div className="flex min-w-0 flex-col gap-1">
            <h2
              id="publish-review-title"
              className="wb-panel-title break-words [overflow-wrap:anywhere]"
            >
              Publish {state.recordName} to {providerName}
            </h2>
            <p className="wb-meta min-w-0 break-words [overflow-wrap:anywhere]">
              Connected account: {accountName}
              {preflight.account.username
                ? ` (@${preflight.account.username.replace(/^@/, "")})`
                : ""}
            </p>
          </div>
          <IconButton
            icon="x"
            label="Close publishing review"
            autoFocus
            onClick={onClose}
            disabled={busy}
            className="shrink-0"
          />
        </header>

        <div tabIndex={-1} className="wb-scroll-fade-y wb-scroll-fade-deep grid min-h-0 min-w-0 flex-1 gap-6 overflow-y-auto overscroll-contain px-4 outline-none pb-5 pt-1 sm:px-6 md:grid-cols-[248px_minmax(0,1fr)]">
          <PublishMedia state={state} />

          <section className="flex min-w-0 flex-col gap-4">
            {state.error && (
              <div role="alert" className="wb-notice items-start" data-tone="bad">
                <Icon name="alert" size={16} className="mt-px shrink-0 text-bad" />
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{state.error}</span>
              </div>
            )}
            {preflight.provider === "tiktok" && creator && (
              <PublishDialogTiktokFields state={state} creator={creator} onChange={onChange} />
            )}

            {preflight.provider === "instagram" && (
              <>
                <p className="wb-notice min-w-0 break-words [overflow-wrap:anywhere]">
                  Instagram Reels are public media. Instagram must fetch this approved video from a short-lived signed URL before publishing.
                </p>
                <FieldLabel label="Reel caption" detail={`${state.caption.length}/2200`} mono>
                  {(id) => (
                    <textarea
                      id={id}
                      value={state.caption}
                      maxLength={2200}
                      onChange={(event) => onChange({ ...state, caption: event.target.value })}
                      className="wb-input min-h-28"
                    />
                  )}
                </FieldLabel>
              </>
            )}

            {preflight.provider === "youtube" && (
              <PublishDialogYoutubeFields
                state={state}
                descriptionBytes={descriptionBytes}
                onChange={onChange}
              />
            )}

            <div className="min-w-0 rounded-lg bg-raised px-3.5 py-3">
              <CheckControl
                label={`Publish this exact approved video to ${providerName} now`}
                checked={state.consent}
                onChange={(checked) => onChange({ ...state, consent: checked })}
              >
                <p className="min-w-0 break-words text-[13px] leading-[18px] text-fg-secondary [overflow-wrap:anywhere]">
                  This is an external mutation. The scheduler will not repeat it. Provider acceptance, processing, failures, and retry state are persisted to this workflow.
                </p>
              </CheckControl>
            </div>
          </section>
        </div>

        <footer className="flex min-w-0 shrink-0 flex-col gap-3 border-t border-hairline px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="wb-meta min-w-0 break-words [overflow-wrap:anywhere]">
            {state.retryFailed
              ? "This creates a new explicit attempt for the same approved asset."
              : "Nothing is sent until you confirm this review."}
          </p>
          <div className="flex shrink-0 flex-col-reverse gap-2.5 sm:flex-row">
            <Button size={40} onClick={onClose} disabled={busy} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              variant="primary"
              size={40}
              onClick={onPublish}
              disabled={busy || !canPublish}
              aria-busy={busy || undefined}
              className="w-full sm:w-auto"
            >
              <Send strokeWidth={2} />
              {publishLabel(state.retryFailed, busy)}
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}

function PublishMedia({ state }: { state: PublishDialogState }) {
  const { asset } = state.preflight;
  const facts: KeyValueRow[] = [];
  if (asset.width && asset.height) {
    facts.push({ label: "Size", value: `${asset.width} × ${asset.height}`, mono: true });
  }
  if (asset.durationSec) {
    facts.push({ label: "Length", value: `${Math.round(asset.durationSec)}s`, mono: true });
  }
  return (
    <aside className="flex min-w-0 flex-col gap-3">
      <div className="wb-well">
        <video
          src={asset.previewUrl}
          controls
          preload="metadata"
          className="aspect-[9/16] max-h-[32dvh] w-full max-w-[220px] rounded-lg bg-media object-contain md:max-h-[391px]"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="wb-label">Approved Gallery output</span>
        <span className="min-w-0 break-words text-[13px] leading-4 text-fg-secondary [overflow-wrap:anywhere]">
          {asset.filename}
        </span>
      </div>
      {facts.length > 0 && <KeyValueList rows={facts} />}
    </aside>
  );
}

const PROVIDER_NAMES: Record<PublishDialogState["preflight"]["provider"], string> = {
  tiktok: "TikTok",
  instagram: "Instagram Reels",
  youtube: "YouTube Shorts",
};

function publishLabel(retryFailed: boolean, busy: boolean) {
  if (busy) return "Publishing";
  return retryFailed ? "Retry publish" : "Publish now";
}
