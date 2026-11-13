"use client";

import type { CSSProperties } from "react";
import { Button, Icon, Panel, Toggle } from "@/components/workbench";
import { getModel } from "@/lib/ai/models";
import type { JobDetail, JobOutput } from "@/lib/generation-editor";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { JobIcon } from "./job-icons";
import {
  ENHANCEMENT_TOOLS,
  asString,
  type JobDetailActions,
  type JobDetailViewModel,
} from "./job-enhancements";

export function JobQuickEdits({
  view,
  actions,
}: {
  view: JobDetailViewModel;
  actions: JobDetailActions;
}) {
  return (
    <section aria-label="Quick edits" className="wb-panel flex-none gap-2.5 py-[18px]">
      <div className="grid grid-cols-2 gap-2">
        {ENHANCEMENT_TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            aria-pressed={view.selectedEnhancement === tool.id}
            onClick={() => actions.onSelectTool(tool.id)}
            className="flex h-[38px] min-w-0 items-center gap-2 rounded-lg bg-raised px-3 text-left text-[13px] font-semibold leading-4 text-fg transition-[background-color,box-shadow] duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised-strong aria-pressed:bg-ember-wash aria-pressed:text-ember-text aria-pressed:shadow-[inset_0_0_0_2px_var(--pf-ember)]"
          >
            <JobIcon name={tool.icon} size={16} className="flex-none" />
            <span className="truncate">{tool.title}</span>
          </button>
        ))}
      </div>
      <label htmlFor="enhancement-instruction" className="wb-label pt-1.5">
        Instruction
      </label>
      <textarea
        id="enhancement-instruction"
        rows={2}
        value={view.enhancementInstruction}
        onChange={(event) => actions.onInstructionChange(event.target.value)}
        className="wb-input h-auto min-h-[60px] resize-none py-2.5 text-[13px] leading-[18px]"
      />
    </section>
  );
}

export function JobRefinePanel({
  view,
  actions,
}: {
  view: JobDetailViewModel;
  actions: JobDetailActions;
}) {
  const { featured, isCompleted, isApplying, enhancementInstruction, editStrength, preserveSubject } = view;
  return (
    <Panel title="Refine" className="flex-none gap-3 py-[18px] [&_.wb-panel-head]:h-5">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between">
          <label htmlFor="edit-strength" className="wb-label">
            Edit strength
          </label>
          <span className="wb-mono text-fg">{editStrength}%</span>
        </div>
        <input
          id="edit-strength"
          type="range"
          min={0}
          max={100}
          step={1}
          value={editStrength}
          onChange={(event) => actions.onEditStrengthChange(Number(event.target.value))}
          style={{ "--fill": `${editStrength}%` } as CSSProperties}
          className={RANGE_CLASS}
        />
      </div>
      <div className="flex items-center gap-3">
        <span id="preserve-subject-label" className="flex-1 text-[14px] font-semibold leading-5 text-fg">
          Preserve subject
        </span>
        <Toggle
          aria-labelledby="preserve-subject-label"
          checked={preserveSubject}
          onCheckedChange={actions.onPreserveSubjectChange}
        />
      </div>
      <Button
        variant="strong"
        size={40}
        block
        disabled={!featured || !isCompleted || isApplying || !enhancementInstruction.trim()}
        onClick={actions.onApply}
        className="flex-none"
      >
        {isApplying ? "Starting enhancement…" : "Apply"}
      </Button>
    </Panel>
  );
}

export function JobDetailsPanel({ job, featured }: { job: JobDetail; featured: JobOutput | undefined }) {
  const input = job.input ?? {};
  const left = [
    { label: "Model", value: getModel(job.model)?.name ?? job.model, mono: false },
    { label: "Created", value: formatRelativeDate(job.createdAt), mono: true },
    { label: "Cost", value: formatCost(job.actualCost ?? job.estimatedCost), mono: true },
  ];
  const right = [
    { label: "Size", value: formatBytes(featured?.fileSizeBytes ?? null), mono: true },
    { label: "Aspect", value: asString(input.aspectRatio) ?? "-", mono: true },
    {
      label: "Time",
      value: job.durationMs !== null ? `${(job.durationMs / 1000).toFixed(1)}s` : "-",
      mono: true,
    },
  ];
  return (
    <Panel title="Details" className="flex-none gap-2.5 py-[18px] [&_.wb-panel-head]:h-5">
      <dl className="m-0 flex gap-5">
        <DetailColumn rows={left} className="min-w-0 flex-1" />
        <DetailColumn rows={right} className="w-[128px] flex-none" />
      </dl>
      <div className="flex items-baseline justify-between gap-3 border-t border-hairline pt-2.5">
        <span className="text-[13px] leading-[18px] text-fg-muted">Job</span>
        <span className="wb-mono min-w-0 text-right leading-[18px] text-fg-secondary [overflow-wrap:anywhere]">
          {job.id}
        </span>
      </div>
    </Panel>
  );
}

function DetailColumn({
  rows,
  className,
}: {
  rows: { label: string; value: string; mono: boolean }[];
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      {rows.map((row) => (
        <div key={row.label} className="flex min-w-0 justify-between gap-3">
          <dt className="flex-none text-[13px] leading-[18px] text-fg-muted">{row.label}</dt>
          <dd
            className={
              row.mono
                ? "m-0 truncate font-mono text-[12px] leading-[18px] text-fg"
                : "m-0 truncate text-[13px] font-semibold leading-[18px] text-fg"
            }
            title={row.value}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </div>
  );
}

export function JobPromptPanel({
  view,
  actions,
}: {
  view: JobDetailViewModel;
  actions: JobDetailActions;
}) {
  const { job } = view;
  const negativePrompt = asString(job.input?.negativePrompt);
  const canContinueVideo = job.type === "video" && !job.tags.includes("video-swap");
  return (
    <section aria-labelledby="job-prompt-title" className="wb-panel min-h-[240px] gap-3 py-[18px] xl:flex-1">
      <div className="flex h-7 flex-none items-center gap-2.5">
        <h2 id="job-prompt-title" className="wb-panel-title flex-1">
          Prompt
        </h2>
        <button
          type="button"
          onClick={actions.onCopyPrompt}
          className="wb-btn h-7 gap-1.5 pl-2.5 pr-3 text-[12px] leading-4"
        >
          <JobIcon name="copy" size={14} />
          Copy
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <p className="m-0 text-[14px] leading-5 text-fg [overflow-wrap:anywhere]">{job.prompt}</p>
        <div className="flex flex-col gap-[3px]">
          <span className="wb-label">Negative</span>
          <p className="m-0 text-[14px] leading-5 text-fg [overflow-wrap:anywhere]">{negativePrompt ?? "-"}</p>
        </div>
      </div>
      <div className="flex flex-none gap-2">
        {canContinueVideo && (
          <Button size={40} block onClick={actions.onContinueVideo}>
            Continue video
          </Button>
        )}
        <Button size={40} block onClick={actions.onGenerateSimilar}>
          Remix in Generate
          <Icon name="chevron-right" size={16} />
        </Button>
      </div>
    </section>
  );
}

function formatBytes(bytes: number | null) {
  if (bytes === null) return "-";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const RANGE_CLASS = [
  "h-[18px] w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none",
  "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full",
  "[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--pf-ember)_var(--fill),var(--pf-raised-strong)_var(--fill))]",
  "[&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:appearance-none",
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--pf-thumb)]",
  "[&::-webkit-slider-thumb]:shadow-[0_0_0_2px_var(--pf-ember)]",
  "focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_2px_var(--pf-ember),0_0_0_6px_var(--pf-ember-wash)]",
  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full",
  "[&::-moz-range-track]:bg-[linear-gradient(to_right,var(--pf-ember)_var(--fill),var(--pf-raised-strong)_var(--fill))]",
  "[&::-moz-range-thumb]:size-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
  "[&::-moz-range-thumb]:bg-[var(--pf-thumb)] [&::-moz-range-thumb]:shadow-[0_0_0_2px_var(--pf-ember)]",
].join(" ");
