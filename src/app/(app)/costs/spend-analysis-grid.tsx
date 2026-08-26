import dynamic from "next/dynamic";
import Link from "next/link";
import { PIE_COLORS } from "@/lib/costs/chart-colors";
import { formatCost } from "@/lib/utils/format-cost";
import type { SpendAnalysisGridProps } from "./types";

export function SpendAnalysisGrid({ dashboard, view }: SpendAnalysisGridProps) {
  const chartHasSpend = dashboard.chartData.some(
    (point) => point.image > 0 || point.video > 0
  );

  return (
    <section
      data-spend-analysis-grid="true"
      className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"
    >
      <article className="pf-card min-w-0 p-4 sm:p-5">
        <header
          data-spend-chart-head="true"
          className="mb-4 flex flex-wrap items-start justify-between gap-3"
        >
          <div>
            <h2 className="pf-section-title">Spend Over Time</h2>
            <p className="mt-1 text-[12px] text-[var(--pf-muted)]">
              Daily image and video cost · {dashboard.period.toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[var(--pf-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-sm bg-[var(--pf-muted)]" />
              Image
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-sm bg-[var(--pf-ink)]" />
              Video
            </span>
          </div>
        </header>
        {chartHasSpend ? (
          <div data-spend-chart-slot="true" className="h-[276px]" style={{ height: 276 }}>
            <CostChart data={dashboard.chartData} />
          </div>
        ) : (
          <div
            data-spend-chart-slot="true"
            data-spend-chart="empty"
            role="img"
            aria-label="No image or video spend in this period"
            className="h-[276px] rounded-[8px] bg-[var(--pf-active)]"
            style={{ height: 276 }}
          />
        )}
      </article>

      <aside
        data-spend-breakdown="true"
        className="pf-card min-w-0 p-4 sm:p-5"
      >
        <header data-spend-breakdown-head="true" className="border-b border-[var(--pf-border)] pb-3">
          <h2 className="pf-section-title">Spend breakdown</h2>
          <p className="mt-1 text-[12px] text-[var(--pf-muted)]">
            Workflow type and model mix · {dashboard.period.toUpperCase()}
          </p>
        </header>

        {view.workflowPieData.length > 0 ? (
          <>
            <div className="pt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)]">
                Spend by Format
              </h3>
              <div className="mt-2 grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3">
                <div
                  className="size-28 shrink-0"
                  style={{ width: 112, height: 112 }}
                  aria-label="Workflow type spend distribution"
                >
                  <ModelPieChart data={view.workflowPieData} />
                </div>
                <div className="min-w-0 space-y-3">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex min-w-0 items-center gap-2 text-[var(--pf-muted)]">
                        <span className="size-2 shrink-0 rounded-sm bg-[var(--pf-muted)]" />
                        <span className="truncate">Image</span>
                      </span>
                      <strong className="shrink-0 text-[var(--pf-ink)]">{view.imagePct.toFixed(0)}%</strong>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-[var(--pf-muted)]">
                      {formatCost(dashboard.breakdown.image.cost)} · {dashboard.breakdown.image.count} {dashboard.breakdown.image.count === 1 ? "job" : "jobs"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex min-w-0 items-center gap-2 text-[var(--pf-muted)]">
                        <span className="size-2 shrink-0 rounded-sm bg-[var(--pf-ink)]" />
                        <span className="truncate">Video</span>
                      </span>
                      <strong className="shrink-0 text-[var(--pf-ink)]">{view.videoPct.toFixed(0)}%</strong>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-[var(--pf-muted)]">
                      {formatCost(dashboard.breakdown.video.cost)} · {dashboard.breakdown.video.count} {dashboard.breakdown.video.count === 1 ? "job" : "jobs"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-[var(--pf-border)] pt-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)]">
                  Spend by Model
                </h3>
                <span className="text-[11px] text-[var(--pf-muted)]">Highest first</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {view.modelEntries.slice(0, 5).map(([name, data], index) => (
                  <div
                    key={name}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-[8px] bg-[var(--pf-active)] px-2.5 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-[11px] font-medium text-[var(--pf-ink)]">
                      <span
                        className="inline-block size-2 shrink-0 rounded-sm"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="truncate">{name}</span>
                    </span>
                    <span className="shrink-0 text-right text-[11px] text-[var(--pf-muted)]">
                      <strong className="pf-data block text-[11px] text-[var(--pf-ink)]">
                        {formatCost(data.cost)}
                      </strong>
                      {modelShareLabel(data.cost, view.totalModelCost)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div data-spend-empty="true" className="space-y-3 py-4">
            <p className="text-[12px] leading-4 text-[var(--pf-muted)]">
              No spend data yet. Breakdowns appear after the first tracked cost.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/ugc-clone" className="pf-button-secondary text-[12px]">
                Start Clone
              </Link>
              <Link href="/generate" className="pf-button-secondary text-[12px]">
                Open Generate
              </Link>
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}

function modelShareLabel(cost: number, totalModelCost: number) {
  if (totalModelCost <= 0) return "0%";
  return `${((cost / totalModelCost) * 100).toFixed(1)}%`;
}

const CostChart = dynamic(
  () => import("@/components/cost-chart").then((module) => module.CostChart),
  {
    ssr: false,
    loading: () => <div className="h-full rounded-[8px] bg-[var(--pf-active)]" aria-hidden />,
  }
);

const ModelPieChart = dynamic(
  () => import("@/components/cost-chart").then((module) => module.ModelPieChart),
  {
    ssr: false,
    loading: () => <div className="size-full rounded-full bg-[var(--pf-active)]" aria-hidden />,
  }
);
