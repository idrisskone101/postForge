"use client";

import { Loader2, Redo2, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  getGenerationStatusCopy,
  type JobDetail,
  type JobOutput,
} from "@/lib/generation-editor";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import {
  ENHANCEMENT_TOOLS,
  asString,
  type InspectorTab,
  type JobDetailActions,
  type JobDetailViewModel,
} from "./job-enhancements";

export function JobInspectorTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
}) {
  return (
    <div className="border-b border-border p-3">
      <div
        role="tablist"
        aria-label="Generation editor panels"
        className="grid grid-cols-3 gap-1 rounded-lg bg-[var(--pf-active)] p-1"
      >
        {(["enhance", "details", "prompts"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              "flex h-9 items-center justify-center rounded-lg text-[12px] font-semibold capitalize transition-colors",
              activeTab === tab
                ? "bg-[var(--pf-surface)] text-foreground shadow-[var(--pf-shadow-2xs)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

export function JobEnhancePanel({
  view,
  actions,
}: {
  view: JobDetailViewModel;
  actions: JobDetailActions;
}) {
  const {
    job,
    featured,
    selectedEnhancement,
    enhancementInstruction,
    editStrength,
    preserveSubject,
    isCompleted,
    isApplying,
  } = view;
  const {
    onSelectTool,
    onInstructionChange,
    onEditStrengthChange,
    onPreserveSubjectChange,
    onApply,
  } = actions;
  const selectedTool =
    ENHANCEMENT_TOOLS.find((tool) => tool.id === selectedEnhancement) ??
    ENHANCEMENT_TOOLS[0];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Quick actions
          </p>
          <h2 className="mt-1 pf-section-title">
            Refine this output
          </h2>
        </div>
        <span className="rounded-full bg-[var(--pf-link)]/10 px-2 py-1 text-[13px] font-semibold text-[var(--pf-link)]">
          AI
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ENHANCEMENT_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const active = selectedEnhancement === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectTool(tool.id)}
              className={cn(
                "min-w-0 rounded-lg border p-2.5 text-left transition-colors",
                active
                  ? "border-[var(--pf-orange)] bg-[var(--pf-surface)] ring-1 ring-[var(--pf-orange)]/25"
                  : "border-border bg-[var(--pf-surface)] hover:bg-[var(--pf-active)]"
              )}
            >
              <span className="flex items-start gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-[12px] font-semibold text-foreground">
                    {tool.title}
                  </strong>
                  <small className="mt-1 block text-[12px] leading-3.5 text-muted-foreground">
                    {tool.detail}
                  </small>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-border pt-4">
        <label
          htmlFor="enhancement-instruction"
          className="mb-1.5 block text-[12px] font-semibold text-muted-foreground"
        >
          Instruction · {selectedTool.title}
        </label>
        <Textarea
          id="enhancement-instruction"
          value={enhancementInstruction}
          onChange={(event) => onInstructionChange(event.target.value)}
          className="min-h-[104px] resize-none rounded-lg border-border bg-card text-[12px] leading-4 shadow-none"
        />
      </div>

      <label className="block">
        <span className="mb-2 flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
          Edit strength <strong className="text-foreground">{editStrength}%</strong>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={editStrength}
          onChange={(event) => onEditStrengthChange(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer accent-[var(--pf-orange)]"
        />
      </label>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-[var(--pf-active)] px-3 py-2.5">
        <span>
          <strong className="block text-[12px] font-semibold text-foreground">
            Preserve subject
          </strong>
          <small className="mt-0.5 block text-[12px] text-muted-foreground">
            Lock identity and camera geometry
          </small>
        </span>
        <Switch
          aria-label="Preserve subject"
          checked={preserveSubject}
          onCheckedChange={onPreserveSubjectChange}
        />
      </div>

      <Button
        type="button"
        disabled={!featured || !isCompleted || isApplying || !enhancementInstruction.trim()}
        onClick={onApply}
        className="pf-button-primary h-11 w-full text-[12px]"
      >
        {isApplying ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : job.type === "video" ? (
          <Redo2 className="size-3.5" />
        ) : (
          <WandSparkles className="size-3.5" />
        )}
        {isApplying
          ? "Starting enhancement…"
          : job.type === "video"
            ? job.tags.includes("video-swap")
              ? "Remix video in Generate"
              : "Continue this video"
            : "Apply enhancement"}
        {isCompleted && job.type === "image" && (
          <span className="ml-auto opacity-75">{formatCost(job.estimatedCost)}</span>
        )}
      </Button>
    </div>
  );
}

export function JobDetailsPanel({
  job,
  featured,
}: {
  job: JobDetail;
  featured: JobOutput | undefined;
}) {
  const statusCopy = getGenerationStatusCopy(job.status, job.queueStage);
  const input = job.input ?? {};

  return (
    <div className="p-4">
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Output details
      </p>
      <h2 className="mt-1 pf-section-title">
        Generation record
      </h2>
      <dl className="mt-4 divide-y divide-border rounded-lg border border-border px-3">
        {[
          ["Status", statusCopy.label],
          ["Type", job.type],
          ["Model", job.model],
          ["Created", formatRelativeDate(job.createdAt)],
          [
            "Size",
            featured?.width && featured?.height
              ? `${featured.width} × ${featured.height} px`
              : "Not available",
          ],
          ["Aspect", asString(input.aspectRatio) ?? "Not available"],
          [
            "Generation time",
            job.durationMs !== null
              ? `${(job.durationMs / 1000).toFixed(1)}s`
              : "Not available",
          ],
          ["Cost", formatCost(job.actualCost ?? job.estimatedCost)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 py-2.5 text-[12px]"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="truncate text-right font-semibold capitalize text-foreground">
              {label === "Cost" || label === "Created" ? (
                <span className="pf-data">{value}</span>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 rounded-lg bg-[var(--pf-canvas)] p-3">
        <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Source
        </span>
        <strong className="mt-1 block text-[12px] font-semibold text-foreground">
          Generate Studio
        </strong>
        <small className="pf-data mt-1 block min-w-0 break-words text-[12px] text-muted-foreground [overflow-wrap:anywhere]">
          Job {job.id}
        </small>
      </div>
    </div>
  );
}

