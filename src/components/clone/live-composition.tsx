import { Icon } from "@/components/workbench";
import { cn } from "@/lib/utils";
import type { CloneSetupStep } from "@/components/clone/types";
import type { CloneDraft } from "@/components/clone/view-models";

export function CloneLiveComposition({
  draft,
}: {
  draft: CloneDraft;
}) {
  const {
    activeSetupStep,
    videoInfo,
    sourcePreviewSrc,
    avatarId,
    selectedSavedReference: selectedReference,
    selectedGeneratedReference,
    collectionReferenceUrl,
    sourceReady,
    identityReady,
    referenceReady,
    onSelectStep,
  } = draft;
  const referencePreview = collectionReferenceUrl ?? selectedReference?.previewUrl ??
    (selectedGeneratedReference?.status === "completed" && selectedGeneratedReference.fileId
      ? `/api/files/${selectedGeneratedReference.fileId}`
      : null);
  const avatarPreview = avatarId
    ? `/api/avatars/${encodeURIComponent(avatarId)}`
    : null;
  const sourceThumb = videoInfo
    ? `/api/ugc-clone/sources/${encodeURIComponent(videoInfo.id)}/thumbnail`
    : null;

  const slots: {
    id: CloneSetupStep;
    label: string;
    ready: boolean;
    thumb: string | null;
  }[] = [
    { id: "source", label: "Source", ready: sourceReady, thumb: sourceThumb },
    { id: "identity", label: "Identity", ready: identityReady, thumb: avatarPreview },
    { id: "reference", label: "Reference", ready: referenceReady, thumb: referencePreview },
  ];

  return (
    <aside
      data-clone-live-composition="true"
      aria-label="Live composition"
      className="wb-panel gap-3"
    >
      <div className="flex h-7 shrink-0 items-center justify-between gap-3">
        <h2 className="wb-panel-title">Live composition</h2>
        <span className="inline-flex h-6 items-center rounded-full bg-raised px-2.5 text-[12px] font-semibold leading-4 text-fg-secondary">
          9:16 · Fit
        </span>
      </div>

      <div className="flex h-[344px] shrink-0 items-center justify-center gap-3.5 rounded-lg bg-well">
        <div className="relative flex h-[304px] w-[171px] shrink-0 overflow-hidden rounded-lg bg-media">
          {referencePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={referencePreview}
              alt="Selected clone reference"
              className="size-full object-contain"
            />
          ) : avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt="Selected clone identity"
              className="size-full object-cover"
            />
          ) : sourcePreviewSrc && videoInfo ? (
            <video
              src={sourcePreviewSrc}
              width={videoInfo.width}
              height={videoInfo.height}
              muted
              playsInline
              controls
              preload="metadata"
              className="size-full object-cover"
            />
          ) : (
            <span className="grid size-full place-items-center rounded-lg border border-dashed border-edge text-fg-muted">
              <Icon name="clone" size={20} />
            </span>
          )}
          {videoInfo && (referencePreview || avatarPreview) ? (
            <span className="wb-tile-duration left-2 right-auto">
              {formatClock(videoInfo.durationSec)}
            </span>
          ) : null}
        </div>

        <div className="flex w-[118px] shrink-0 flex-col gap-2">
          {slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => onSelectStep(slot.id)}
              aria-current={activeSetupStep === slot.id ? "step" : undefined}
              aria-label={`${slot.label}: ${slot.ready ? "ready" : "required"}. Edit ${slot.label}.`}
              className={cn(
                "flex items-center gap-2 rounded-lg bg-raised p-2 text-left text-[12px] font-semibold leading-4 text-fg",
                "transition-[box-shadow,background-color] duration-[160ms] ease-pf hover:bg-raised-strong",
                "aria-[current=step]:shadow-[0_0_0_2px_var(--pf-ember)]"
              )}
            >
              {slot.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slot.thumb}
                  alt=""
                  className="size-7 shrink-0 rounded-sm bg-media object-cover"
                />
              ) : (
                <span className="grid size-7 shrink-0 place-items-center rounded-sm border border-dashed border-edge text-fg-secondary">
                  <Icon name="plus" size={12} strokeWidth={2} />
                </span>
              )}
              <span className="min-w-0 truncate">{slot.label}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function formatClock(sec: number) {
  const total = Math.round(sec);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}
