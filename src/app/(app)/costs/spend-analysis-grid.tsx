"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Panel } from "@/components/workbench/panel";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { axisMoney, modelLabel, niceMoneyCeiling, spendChartBars } from "./spend-format";
import type { SpendAnalysisGridProps } from "./types";

export function SpendAnalysisGrid({ dashboard, view }: SpendAnalysisGridProps) {
  const [plotWidth, setPlotWidth] = useState<number | null>(null);
  const plotRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setPlotWidth(Math.floor(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const chart = spendChartBars(dashboard.chartData, plotWidth ?? 0);
  const points = chart.bars;
  const top = niceMoneyCeiling(Math.max(0, ...points.map((point) => point.image + point.video)));
  const xLabels = [dayFirst(points[0]?.date), dayFirst(points[Math.floor(points.length / 2)]?.date), "Today"];
  const formats = [
    { key: "video", name: "Video", cost: dashboard.breakdown.video.cost, swatch: "bg-chart-1" },
    { key: "image", name: "Image", cost: dashboard.breakdown.image.cost, swatch: "bg-chart-2" },
  ].filter((entry) => entry.cost > 0);
  const formatTotal = formats.reduce((sum, entry) => sum + entry.cost, 0);
  const models = view.modelEntries.slice(0, 6);
  const topModelCost = models[0]?.[1].cost ?? 0;

  return (
    <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:flex">
      <Panel pad="none" className="min-w-0 gap-2.5 p-5 lg:col-span-2 xl:flex-1" aria-label={chart.unit === "week" ? "Spend by week" : "Spend by day"}>
        <div className="flex h-7 shrink-0 items-center gap-4">
          <h2 className="wb-panel-title flex-1">{chart.unit === "week" ? "By week" : "By day"}</h2>
          <Legend swatch="bg-chart-1" label="Video" />
          <Legend swatch="bg-chart-2" label="Image" />
        </div>
        <div className="flex gap-2">
          <div className="flex h-[166px] w-10 shrink-0 flex-col justify-between text-right font-mono text-[12px] leading-4 text-fg-muted">
            <span>{axisMoney(top)}</span>
            <span>{axisMoney(top / 2)}</span>
            <span>$0</span>
          </div>
          <div className="relative flex h-[166px] min-w-0 flex-1 flex-col justify-between py-2">
            <span className="border-t border-dotted border-[var(--pf-chart-grid)]" />
            <span className="border-t border-dotted border-[var(--pf-chart-grid)]" />
            <span className="border-t border-[var(--pf-chart-grid)]" />
            <div ref={plotRef} className="wb-fade-in absolute inset-x-0 top-2 h-[150px]">
              {plotWidth ? <CostChart data={points} max={top} barSize={chart.barSize} /> : null}
            </div>
          </div>
        </div>
        <div className="flex justify-between pl-12 font-mono text-[12px] leading-4 text-fg-muted">
          {xLabels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </Panel>

      <Panel pad="none" className="min-w-0 gap-3.5 p-5 xl:w-[252px] xl:shrink-0" aria-label="Spend by format">
        <h2 className="wb-panel-title flex h-7 items-center">By format</h2>
        <div className="flex h-3.5 shrink-0 gap-[3px]" role="img" aria-label="Video and image share of spend">
          {formats.map((entry) => (
            <span
              key={entry.key}
              className={cn("min-w-1 basis-0 rounded-[4px]", entry.swatch)}
              style={{ flexGrow: entry.cost / formatTotal }}
            />
          ))}
        </div>
        <ul className="flex flex-col gap-3 pt-0.5">
          {formats.map((entry) => (
            <li key={entry.key} className="flex items-center gap-2.5">
              <span className={cn("size-2 shrink-0 rounded-[3px]", entry.swatch)} />
              <span className="flex-1 text-[14px] leading-5 text-fg">{entry.name}</span>
              <span className="wb-mono text-fg">{formatCost(entry.cost)}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel pad="none" className="min-w-0 gap-[7px] p-5 xl:w-[320px] xl:shrink-0" aria-label="Spend by model">
        <h2 className="wb-panel-title flex h-7 items-center">By model</h2>
        <ul className="flex flex-col gap-[7px]">
          {models.map(([name, data], index) => (
            <li key={name} className="flex flex-col gap-[5px]">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[13px] font-semibold leading-4 text-fg" title={name}>
                  {modelLabel(name)}
                </span>
                <span className="wb-mono shrink-0 text-fg">{formatCost(data.cost)}</span>
              </span>
              <span className="flex h-1.5 shrink-0 rounded-[var(--pf-radius-pill)] bg-raised">
                <span
                  className={cn("rounded-[var(--pf-radius-pill)]", index < 3 ? "bg-chart-1" : "bg-chart-2")}
                  style={{ width: `${topModelCost > 0 ? Math.max(2, (data.cost / topModelCost) * 100) : 0}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/** "Oct 15" from the series becomes "15 Oct", the order the rest of the app uses. */
function dayFirst(label: string | undefined) {
  if (!label) return "";
  const [month, day] = label.split(" ");
  return day ? `${day} ${month}` : label;
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex h-[26px] items-center gap-1.5 text-[12px] font-medium leading-4 text-fg-secondary">
      <span className={cn("size-2 shrink-0 rounded-[3px]", swatch)} />
      {label}
    </span>
  );
}

const CostChart = dynamic(
  () => import("@/components/cost-chart").then((module) => module.CostChart),
  { ssr: false, loading: () => null },
);
