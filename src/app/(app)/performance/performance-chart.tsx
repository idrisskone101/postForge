import { Panel } from "@/components/workbench/panel";
import type { PerformanceChartSeries } from "./types";

/** Views over the selected range: chart-1 line, ember on the newest datum only. */
export function PerformanceChart({
  title,
  legend,
  series,
}: {
  title: string;
  legend: string;
  series: PerformanceChartSeries;
}) {
  return (
    <Panel pad="none" className="min-w-0 flex-1 gap-3 p-5" aria-label={title}>
      <div className="flex h-7 shrink-0 items-center gap-4">
        <h2 className="wb-panel-title min-w-0 flex-1 truncate">{title}</h2>
        <span className="flex h-[26px] items-center gap-1.5 text-[12px] font-medium leading-4 text-fg-secondary">
          <span className="h-[3px] w-2.5 shrink-0 rounded-[2px] bg-chart-1" />
          {legend}
        </span>
      </div>
      <div className="flex min-h-[150px] flex-1 gap-2">
        <div className="flex w-8 shrink-0 flex-col justify-between text-right font-mono text-[12px] leading-4 text-fg-muted">
          {series.yLabels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <svg
            viewBox="0 0 1000 150"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
            role="img"
            aria-label={series.empty ? "No views reported in this range" : `${title} trend`}
          >
            <path
              d="M0 8H1000M0 75H1000"
              fill="none"
              stroke="var(--pf-chart-grid)"
              strokeDasharray="2 4"
              vectorEffect="non-scaling-stroke"
            />
            <path d="M0 142H1000" fill="none" stroke="var(--pf-chart-grid)" vectorEffect="non-scaling-stroke" />
            {series.empty ? null : (
              <path
                key={series.path}
                d={series.path}
                fill="none"
                stroke="var(--pf-chart-1)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="wb-fade-in"
              />
            )}
          </svg>
          {series.current ? (
            <span
              aria-hidden="true"
              className="wb-fade-in absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel bg-ember"
              style={{ left: `${series.current.left}%`, top: `${series.current.top}%` }}
            />
          ) : null}
          {series.empty ? (
            <p className="absolute inset-x-0 top-[40%] text-center text-[13px] leading-4 text-fg-muted">
              No views reported in this range
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex justify-between pl-10 font-mono text-[12px] leading-4 text-fg-muted">
        {series.xLabels.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
    </Panel>
  );
}
