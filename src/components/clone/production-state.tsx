import type { ReactNode } from "react";
import type { TikTokVideoInfo } from "@/components/tiktok-input";
import { Icon } from "@/components/workbench";
import { cn } from "@/lib/utils";
import type { CloneProductionState } from "@/components/clone/view-models";

type ReadinessRow = {
  label: string;
  ready: boolean;
  value: string;
  detail: string;
};

export function CloneProductionStatePanel({
  production,
  children,
}: {
  production: CloneProductionState & { videoInfo?: TikTokVideoInfo | null };
  children?: ReactNode;
}) {
  const {
    sourceReady,
    trimReady,
    identityReady,
    referenceReady,
    nextAction,
    videoInfo,
    sourceDetail = sourceReady ? "Source selected and available for preview." : "No TikTok source selected yet.",
    trimDetail = trimReady ? "Trim/preparation state is set." : "Choose a source before trimming.",
    identityDetail = identityReady ? "Identity selected for this clone." : "Select an avatar identity.",
    referenceDetail = referenceReady ? "Reference is ready for generation." : "Generate or choose a reference.",
  } = production;
  const rows: ReadinessRow[] = [
    {
      label: "Source",
      ready: sourceReady,
      value: sourceReady ? videoInfo?.label || "Selected" : "Required",
      detail: sourceDetail,
    },
    {
      label: "Trim",
      ready: sourceReady && trimReady,
      value: !sourceReady
        ? "Required"
        : !trimReady
          ? "Trim required"
          : videoInfo
            ? `${Math.round(videoInfo.durationSec)} s`
            : "Ready",
      detail: trimDetail,
    },
    {
      label: "Identity",
      ready: identityReady,
      value: identityReady ? "Selected" : "Required",
      detail: identityDetail,
    },
    {
      label: "Reference",
      ready: referenceReady,
      value: referenceReady ? "Selected" : "Required",
      detail: referenceDetail,
    },
  ];
  const readyCount = rows.filter((row) => row.ready).length;

  return (
    <aside
      data-clone-production-state="true"
      aria-label="Clone readiness"
      className="wb-panel gap-1.5"
    >
      <div className="flex h-[26px] shrink-0 items-baseline justify-between gap-3">
        <h2 className="wb-panel-title">Clone readiness</h2>
        <span className="text-[13px] leading-4 text-fg-secondary">
          {readyCount} / {rows.length}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li key={row.label} title={row.detail} className="flex h-8 min-w-0 items-center gap-2.5">
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full",
                row.ready ? "bg-ok-tint text-ok" : "bg-warn-tint"
              )}
            >
              {row.ready ? (
                <Icon name="check" size={11} strokeWidth={3} />
              ) : (
                <span className="size-1.5 rounded-full bg-warn" />
              )}
            </span>
            <span className="w-[150px] max-sm:w-[96px] shrink-0 text-[14px] font-medium leading-[18px] text-fg">
              {row.label}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-right text-[13px] leading-4",
                row.ready ? "text-fg-secondary" : "font-semibold text-warn"
              )}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>
      {children ?? (
        <p className="pt-1.5 text-[13px] leading-[18px] text-fg-secondary">{nextAction.label}</p>
      )}
    </aside>
  );
}
