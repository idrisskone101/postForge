"use client";

import { CalendarClock, Check, ChevronDown, Loader2, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { SlideshowAutomationFieldsModel } from "./types";

export function SlideshowAutomationBuilderFields({ fields }: { fields: SlideshowAutomationFieldsModel }) {
  const {
    name,
    projectId,
    days,
    time,
    active,
    visualPolicy,
    imageCollectionId,
    hooks,
    projects,
    collections,
    expectedSlideCount,
    estimatedImageCost,
    saving,
    saveError,
    existing,
    onNameChange,
    onProjectChange,
    onVisualPolicyChange,
    onImageCollectionChange,
    onHooksChange,
    onToggleDay,
    onTimeChange,
    onActiveChange,
    onSubmit,
    saveLabel,
  } = fields;

  return (
    <div className="mt-5 space-y-4 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-5 shadow-[var(--pf-shadow-2xs)]">
      <label className="block">
        <span className={FIELD_LABEL}>Name</span>
        <input value={name} onChange={(event) => onNameChange(event.target.value)} className={cn(INPUT, "h-9")} />
      </label>

      <label className="block">
        <span className={FIELD_LABEL}>Starting slideshow</span>
        <span className="relative block">
          <select
            value={projectId}
            onChange={(event) => onProjectChange(event.target.value)}
            className="h-9 w-full appearance-none rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-3 pr-8 text-[12px] text-[var(--pf-ink)] outline-none focus:border-[var(--pf-orange)]"
          >
            <option value="">Generate from hook pool</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--pf-muted)]" />
        </span>
      </label>

      <fieldset>
        <legend className={FIELD_LABEL}>Visuals for each run</legend>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => onVisualPolicyChange("reuse")}
            aria-pressed={visualPolicy === "reuse"}
            className={cn(
              "flex items-start gap-3 rounded-[8px] border p-3 text-left transition",
              visualPolicy === "reuse"
                ? "border-[var(--pf-ink)] bg-[var(--pf-canvas)]"
                : "border-[var(--pf-border)] bg-[var(--pf-surface)] hover:border-[var(--pf-border-strong)]"
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid size-4 place-items-center rounded-full border",
                visualPolicy === "reuse"
                  ? "border-[var(--pf-orange)] bg-[var(--pf-orange)]"
                  : "border-[var(--pf-border-strong)]"
              )}
            >
              {visualPolicy === "reuse" ? <Check className="size-2.5 text-white" /> : null}
            </span>
            <span>
              <span className="block text-[12px] font-semibold text-[var(--pf-ink)]">Reuse starting visuals</span>
              <span className="mt-0.5 block text-[12px] leading-4 text-[var(--pf-muted)]">
                Safe default. Copies the starting slideshow or a saved collection with no image charge.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onVisualPolicyChange("fresh-ai")}
            aria-pressed={visualPolicy === "fresh-ai"}
            className={cn(
              "flex items-start gap-3 rounded-[8px] border p-3 text-left transition",
              visualPolicy === "fresh-ai"
                ? "border-[var(--pf-orange)] bg-[var(--pf-orange)]/[0.04]"
                : "border-[var(--pf-border)] bg-[var(--pf-surface)] hover:border-[var(--pf-border-strong)]"
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid size-4 place-items-center rounded-full border",
                visualPolicy === "fresh-ai"
                  ? "border-[var(--pf-orange)] bg-[var(--pf-orange)]"
                  : "border-[var(--pf-border-strong)]"
              )}
            >
              {visualPolicy === "fresh-ai" ? <Check className="size-2.5 text-white" /> : null}
            </span>
            <span>
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--pf-ink)]">
                <Sparkles className="size-3 text-[var(--pf-orange)]" />
                Generate fresh AI images
              </span>
              <span className="mt-0.5 block text-[12px] leading-4 text-[var(--pf-muted)]">
                One Nano Banana 2 image per slide at $0.08. About ${estimatedImageCost} per {expectedSlideCount}-slide run.
              </span>
            </span>
          </button>
        </div>
      </fieldset>

      {!projectId && visualPolicy === "reuse" ? (
        <label className="block">
          <span className={FIELD_LABEL}>
            Shared image collection <span className="font-normal text-[var(--pf-muted)]">(optional)</span>
          </span>
          <span className="relative block">
            <select
              value={imageCollectionId}
              onChange={(event) => onImageCollectionChange(event.target.value)}
              className="h-9 w-full appearance-none rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-3 pr-8 text-[12px] text-[var(--pf-ink)] outline-none focus:border-[var(--pf-orange)]"
            >
              <option value="">No collection · use text backgrounds</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id} disabled={!collection.imageCount}>
                  {collection.name} · {collection.imageCount} image{collection.imageCount === 1 ? "" : "s"}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--pf-muted)]" />
          </span>
          <span className="mt-1 block text-[12px] text-[var(--pf-muted)]">
            Hook-pool runs cycle through this collection from the shared library without creating paid jobs.
          </span>
        </label>
      ) : null}

      <label className="block">
        <span className={FIELD_LABEL}>Hook pool</span>
        <textarea
          value={hooks}
          onChange={(event) => onHooksChange(event.target.value)}
          rows={3}
          className={cn(INPUT, "resize-none py-2 leading-5")}
        />
        <span className="mt-1 block text-[12px] text-[var(--pf-muted)]">One hook per line. Runs avoid previously used hooks.</span>
      </label>

      <fieldset>
        <legend className={FIELD_LABEL}>Schedule</legend>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => onToggleDay(day)}
              aria-pressed={days.includes(day)}
              className={cn(
                "grid size-8 place-items-center rounded-[8px] border text-[12px] font-bold transition",
                days.includes(day)
                  ? "border-[var(--pf-orange)] bg-[var(--pf-orange)] text-white"
                  : "border-[var(--pf-border)] bg-[var(--pf-surface)] text-[var(--pf-muted)] hover:border-[var(--pf-border-strong)] hover:text-[var(--pf-ink)]"
              )}
            >
              {day.slice(0, 1)}
            </button>
          ))}
          <input
            type="time"
            value={time}
            onChange={(event) => onTimeChange(event.target.value)}
            aria-label="Run time"
            className={cn(INPUT, "ml-auto h-8 w-[104px] px-2")}
          />
        </div>
      </fieldset>

      <label className="flex items-center justify-between rounded-[8px] border border-[var(--pf-border)] p-3">
        <span>
          <span className="block text-[12px] font-semibold text-[var(--pf-ink)]">Start active</span>
          <span className="mt-0.5 block text-[12px] text-[var(--pf-muted)]">
            Pause any time without deleting the setup.
          </span>
        </span>
        <Switch
          checked={active}
          onCheckedChange={onActiveChange}
          aria-label={existing ? "Automation active" : "Start automation active"}
        />
      </label>

      {saveError ? (
        <p role="alert" className="text-[11px] text-[var(--pf-danger)]">{saveError}</p>
      ) : null}

      <button
        type="button"
        onClick={() => void onSubmit()}
        disabled={!name.trim() || !days.length || saving}
        className="pf-button-primary h-10 w-full"
      >
        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarClock className="size-3.5" />}
        {saveLabel}
      </button>
    </div>
  );
}

const INPUT =
  "w-full rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-3 text-[12px] text-[var(--pf-ink)] outline-none transition placeholder:text-[var(--pf-muted)] focus:border-[var(--pf-orange)] focus:ring-2 focus:ring-[var(--pf-orange)]/10";
const FIELD_LABEL = "mb-1.5 block text-[12px] font-semibold text-[var(--pf-muted)]";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
