import { Button } from "@/components/workbench";
import type { CloneDraft } from "@/components/clone/view-models";

export function CloneSourceSummary({
  draft,
}: {
  draft: CloneDraft;
}) {
  const {
    videoInfo,
    originalVideoInfo,
    showTrimmer,
    sourceToolsOpen,
    onSelectStep,
    onToggleTrim,
    onTogglePicker,
  } = draft;
  if (!videoInfo) return null;
  const fullDuration = originalVideoInfo?.durationSec ?? videoInfo.durationSec;
  const trimmed = Math.round(videoInfo.durationSec) < Math.round(fullDuration);

  return (
    <div
      data-clone-source-summary="true"
      className="flex min-w-0 items-center gap-3.5 rounded-lg bg-raised py-2.5 pl-2.5 pr-3.5 max-sm:flex-wrap"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/ugc-clone/sources/${encodeURIComponent(videoInfo.id)}/thumbnail`}
        alt=""
        className="h-14 w-9 shrink-0 rounded-sm bg-media object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[14px] font-semibold leading-[18px] text-fg">
          {videoInfo.label || "Selected source"}
        </p>
        <p className="truncate text-[13px] leading-4 text-fg-secondary">
          {trimmed
            ? `${formatSeconds(videoInfo.durationSec)} of ${formatSeconds(fullDuration)}`
            : formatSeconds(videoInfo.durationSec)}
          {` · ${videoInfo.width}x${videoInfo.height}`}
        </p>
      </div>
      <div className="flex shrink-0 gap-3.5 max-sm:w-full max-sm:gap-2 max-sm:[&>button]:flex-1">
        <Button
          variant="strong"
          size={32}
          aria-pressed={showTrimmer}
          onClick={() => {
            onSelectStep("source");
            onToggleTrim();
          }}
        >
          {showTrimmer ? "Close trim" : "Trim"}
        </Button>
        <Button
          variant="strong"
          size={32}
          aria-pressed={sourceToolsOpen}
          onClick={() => {
            onSelectStep("source");
            onTogglePicker();
          }}
        >
          {sourceToolsOpen ? "Close picker" : "Replace"}
        </Button>
      </div>
    </div>
  );
}

function formatSeconds(sec: number) {
  return `${Math.round(sec)} s`;
}
