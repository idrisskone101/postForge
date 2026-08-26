import { type ReactNode } from "react";
import { Eye, Layers, Users, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CloneSetupStep } from "@/components/clone/types";
import type { CloneDraft } from "@/components/clone/view-models";

export function CloneLiveComposition({
  draft,
}: {
  draft: CloneDraft;
}) {
  const {
    activeSetupStep: activeStep,
    videoInfo,
    sourcePreviewSrc,
    avatarId,
    selectedSavedReference: selectedReference,
    selectedGeneratedReference,
    collectionReferenceUrl,
    sourceReady,
    identityReady,
    referenceReady,
    onSelectStep: onJumpToStep,
  } = draft;
  const referencePreview = collectionReferenceUrl ?? selectedReference?.previewUrl ??
    (selectedGeneratedReference?.status === "completed" && selectedGeneratedReference.fileId
      ? `/api/files/${selectedGeneratedReference.fileId}`
      : null);
  const avatarPreview = avatarId
    ? `/api/avatars/${encodeURIComponent(avatarId)}`
    : null;
  const hasComposition = Boolean(referencePreview ?? avatarPreview ?? (sourcePreviewSrc && videoInfo));
  const stageLabel = referencePreview
    ? "Reference composition"
    : avatarPreview
      ? "Selected identity"
      : sourceReady
        ? "Source composition"
        : "Live composition";

  const slots: {
    id: CloneSetupStep;
    label: string;
    ready: boolean;
    thumb: ReactNode;
  }[] = [
    {
      id: "source",
      label: "Source",
      ready: sourceReady,
      thumb: (
        <span className="grid size-full place-items-center bg-[var(--pf-active)] text-muted-foreground">
          <Video className="size-3.5" />
        </span>
      ),
    },
    {
      id: "identity",
      label: "Identity",
      ready: identityReady,
      thumb: avatarPreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarPreview} alt="" className="size-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center bg-[var(--pf-active)] text-muted-foreground">
          <Users className="size-3.5" />
        </span>
      ),
    },
    {
      id: "reference",
      label: "Reference",
      ready: referenceReady,
      thumb: referencePreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={referencePreview} alt="" className="size-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center bg-[var(--pf-active)] text-muted-foreground">
          <Layers className="size-3.5" />
        </span>
      ),
    },
  ];

  return (
    <aside
      data-clone-live-composition="true"
      className="pf-card min-w-0 lg:sticky lg:top-4"
    >
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <span className="inline-flex items-center gap-2 pf-section-title">
          {hasComposition && <span className="size-1.5 rounded-full bg-[var(--pf-success)]" />}
          {stageLabel}
        </span>
        <span className="rounded-md border border-border bg-[var(--pf-surface)] px-2 py-1 text-[12px] font-semibold text-muted-foreground shadow-[var(--pf-shadow-2xs)]">
          9:16 · Fit
        </span>
      </div>

      <div className={hasComposition ? "bg-[#09090B] p-5 sm:p-7" : "bg-[var(--pf-active)] p-5 sm:p-7"}>
        {hasComposition ? (
          <div className="mx-auto aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-lg border border-white/10 bg-[#09090B] shadow-[var(--pf-shadow-lg)]">
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
            ) : null}
          </div>
        ) : (
          <div className="mx-auto flex aspect-[9/16] w-full max-w-[360px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--pf-border-strong)] bg-[var(--pf-active)] px-8 text-center">
            <span className="grid size-12 place-items-center rounded-2xl border border-border bg-[var(--pf-surface)] text-muted-foreground shadow-[var(--pf-shadow-2xs)]">
              <Eye className="size-5" />
            </span>
            <p className="mt-4 text-sm font-semibold text-foreground">Your clone takes shape here</p>
            <p className="mt-1 max-w-[240px] text-xs leading-5 text-muted-foreground">
              Complete the three inputs and the composition builds live.
            </p>
            <div className="mt-5 grid w-full max-w-[240px] gap-1.5">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => onJumpToStep(slot.id)}
                  className="group flex items-center gap-2.5 rounded-lg border border-border bg-[var(--pf-surface)] px-2.5 py-2 text-left shadow-[var(--pf-shadow-2xs)] transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[var(--pf-shadow-sm)] active:scale-[0.98]"
                >
                  <span className="size-6 shrink-0 overflow-hidden rounded-md">{slot.thumb}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                    {slot.label}
                  </span>
                  <span className={cn(
                    "shrink-0 text-[12px] font-bold uppercase tracking-wider",
                    slot.ready ? "text-[var(--pf-success)]" : "text-muted-foreground"
                  )}>
                    {slot.ready ? "Ready" : "Add"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-px border-t border-border bg-border">
        {slots.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => onJumpToStep(slot.id)}
            aria-label={`${slot.label}: ${slot.ready ? "ready" : "required"}. Edit ${slot.label}.`}
            className="group flex items-center gap-2 bg-[var(--pf-surface)] px-3 py-3 text-left transition-colors duration-[180ms] hover:bg-[var(--pf-active)]"
          >
            <span className="size-7 shrink-0 overflow-hidden rounded-md border border-border shadow-[var(--pf-shadow-2xs)]">
              {slot.thumb}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                {slot.label}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    slot.ready ? "bg-[var(--pf-success)]" : "bg-[var(--pf-border-strong)]"
                  )}
                />
                <span className={cn("truncate", !slot.ready && "text-muted-foreground")}>
                  {slot.ready ? "Ready" : "Required"}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border bg-[var(--pf-surface)] px-4 py-3 text-[12px] text-muted-foreground">
        <span className="capitalize">Editing {activeStep}</span>
        <span>{referenceReady && identityReady && sourceReady ? "All inputs ready" : "Setup in progress"}</span>
      </div>
    </aside>
  );
}
