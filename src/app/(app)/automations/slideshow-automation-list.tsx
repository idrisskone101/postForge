"use client";

import Link from "next/link";
import {
  CalendarDays,
  Edit3,
  Layers,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { VisualTile } from "@/components/slideshow/slide-preview";
import { cn } from "@/lib/utils";
import {
  slideshowNextRunLabel,
  slideshowStatusDotClass,
  slideshowStatusPillClass,
} from "./hub-visual";
import type { AutomationsWorkspace } from "./use-automations-workspace";

export function SlideshowAutomationList({
  hub,
}: {
  hub: AutomationsWorkspace;
}) {
  const {
    slideshowAutomations,
    slideshowError,
    slideshowDeleteId,
    setSlideshowDeleteId,
    busy,
    load,
    toggleSlideshow,
    removeSlideshow,
  } = hub;

  return (
    <section className="pf-card mt-3 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="pf-section-title mt-1">Carousel draft schedules</h2>
          <p className="mt-1 max-w-[560px] min-w-0 break-words text-[12px] leading-4 text-[var(--pf-muted)] [overflow-wrap:anywhere]">
            Scheduled runs generate full slideshow drafts into the Slideshow studio. Nothing publishes automatically; exports stay a manual, reviewed action.
          </p>
        </div>
        <Link href="/automations/new?workflow=slideshow" className="pf-button-primary shrink-0">
          <Plus className="size-3.5 shrink-0" /> New slideshow automation
        </Link>
      </div>

      {slideshowError ? (
        <div
          role="alert"
          className="mt-4 flex min-w-0 items-start justify-between gap-3 rounded-[8px] border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] text-[var(--pf-danger)]"
        >
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{slideshowError}</span>
          <button onClick={load} className="pf-button-secondary shrink-0 !min-h-8">
            <RefreshCw className="size-3 shrink-0" /> Retry
          </button>
        </div>
      ) : null}

      {slideshowAutomations.length === 0 && !slideshowError ? (
        <div className="py-10 text-center">
          <Layers className="mx-auto size-7 text-[var(--pf-muted)]" />
          <h3 className="mt-2 text-[13px] font-semibold text-[var(--pf-ink)]">
            No slideshow schedules yet
          </h3>
          <p className="mx-auto mt-1 max-w-[400px] text-[11px] leading-4 text-[var(--pf-muted)]">
            Create drafts on a cadence from a hook pool or an existing slideshow, then review and export them in the studio.
          </p>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-[var(--pf-border)]">
          {slideshowAutomations.map((automation) => {
            const isActive = automation.status === "active";
            return (
              <div
                key={automation.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <VisualTile
                    visualKey={automation.visualKey ?? "coral-glow"}
                    className="size-10 shrink-0 rounded-[8px]"
                  />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--pf-ink)]">
                      <span className="truncate">{automation.name}</span>
                      <span className="shrink-0 rounded-full bg-[var(--pf-active)] px-1.5 py-px text-[11px] font-bold text-[var(--pf-muted)]">
                        Slideshow
                      </span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--pf-muted)]">
                      <CalendarDays className="size-3" />
                      {automation.cadence}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-[12px] font-medium",
                        automation.visualPolicy === "fresh-ai"
                          ? "text-[var(--pf-lamp-amber)]"
                          : "text-[var(--pf-success)]"
                      )}
                    >
                      {automation.visualPolicy === "fresh-ai"
                        ? "Fresh AI images. $0.08 per slide."
                        : "Reuses saved visuals. No image cost."}
                    </p>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <p className="text-[12px] font-semibold text-[var(--pf-muted)]">Next run</p>
                  <p className="mt-0.5 text-[11px] font-medium text-[var(--pf-ink)]">
                    {slideshowNextRunLabel({
                      active: isActive,
                      nextRunAt: automation.nextRunAt,
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={slideshowStatusPillClass(isActive)}>
                    <span className={slideshowStatusDotClass(isActive)} />
                    {isActive ? "Active" : "Paused"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    aria-label={isActive ? `Pause ${automation.name}` : `Resume ${automation.name}`}
                    disabled={busy === automation.id}
                    onClick={() => void toggleSlideshow(automation)}
                    className={cn(
                      "relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50",
                      isActive ? "bg-[var(--pf-success)]" : "bg-[var(--pf-border-strong)]"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-[3px] size-4 rounded-full bg-[var(--pf-surface)] shadow-[var(--pf-shadow-2xs)] transition-all duration-200",
                        isActive ? "left-[19px]" : "left-[3px]"
                      )}
                    />
                  </button>
                  <span className="mx-1 h-5 w-px bg-[var(--pf-border)]" />
                  <Link
                    href="/slideshow"
                    aria-label={`Open drafts for ${automation.name}`}
                    title="Drafts land in the Slideshow studio"
                    className="grid size-8 place-items-center rounded-[8px] text-[var(--pf-muted)] transition-colors hover:bg-[var(--pf-active)] hover:text-[var(--pf-ink)]"
                  >
                    <Layers className="size-3.5" />
                  </Link>
                  <Link
                    href={`/automations/new?workflow=slideshow&id=${encodeURIComponent(automation.id)}`}
                    aria-label={`Edit ${automation.name}`}
                    className="grid size-8 place-items-center rounded-[8px] text-[var(--pf-muted)] transition-colors hover:bg-[var(--pf-active)] hover:text-[var(--pf-ink)]"
                  >
                    <Edit3 className="size-3.5" />
                  </Link>
                  {slideshowDeleteId === automation.id ? (
                    <span className="flex items-center gap-1.5 rounded-[8px] bg-[var(--pf-danger)]/10 px-2 py-1">
                      <span className="text-[12px] font-semibold text-[var(--pf-danger)]">Delete?</span>
                      <button
                        onClick={() => void removeSlideshow(automation)}
                        disabled={busy === automation.id}
                        className="text-[12px] font-bold text-[var(--pf-danger)] underline underline-offset-2 disabled:opacity-50"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setSlideshowDeleteId(null)}
                        className="text-[12px] font-semibold text-[var(--pf-muted)]"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setSlideshowDeleteId(automation.id)}
                      aria-label={`Delete ${automation.name}`}
                      className="grid size-8 place-items-center rounded-[8px] text-[var(--pf-muted)] transition-colors hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)]"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
