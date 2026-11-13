"use client";

import Link from "next/link";
import { VisualTile } from "@/components/slideshow/slide-preview";
import {
  Button,
  EmptyState,
  Icon,
  Toggle,
  buttonClass,
} from "@/components/workbench";
import { slideshowNextRunLabel } from "./hub-visual";
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
    <section className="flex min-w-0 shrink-0 flex-col gap-1.5 rounded-xl bg-panel p-5 shadow-panel xl:w-[340px]">
      <div className="flex items-center justify-between gap-3 pb-2">
        <h2 className="wb-panel-title min-w-0">Carousel draft schedules</h2>
        <Link href="/automations/new?workflow=slideshow" className={buttonClass("quiet", 32)}>
          New
        </Link>
      </div>

      {slideshowError ? (
        <div role="alert" className="wb-notice" data-tone="bad">
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            <strong>Schedules did not load.</strong> {slideshowError}
          </span>
          <Button size={32} onClick={load}>
            Retry
          </Button>
        </div>
      ) : null}

      {slideshowAutomations.length === 0 && !slideshowError ? (
        <EmptyState icon="slideshow" title="No carousel schedules yet" className="flex-1" />
      ) : (
        <div className="flex flex-col">
          {slideshowAutomations.map((automation) => {
            const isActive = automation.status === "active";
            return (
              <div
                key={automation.id}
                className="flex flex-col gap-2 border-b border-hairline py-2.5 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <VisualTile
                    visualKey={automation.visualKey ?? "coral-glow"}
                    className="h-[50px] w-10 shrink-0 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="wb-row-title">{automation.name}</p>
                    <p className="wb-row-sub">{automation.cadence}</p>
                    <p className="flex items-center gap-1.5 pt-0.5">
                      <Icon name="clock" size={12} className="shrink-0 text-fg-muted" />
                      <span className="wb-mono text-fg">
                        {slideshowNextRunLabel({
                          active: isActive,
                          nextRunAt: automation.nextRunAt,
                        })}
                      </span>
                    </p>
                  </div>
                  <Toggle
                    checked={isActive}
                    disabled={busy === automation.id}
                    onCheckedChange={() => void toggleSlideshow(automation)}
                    label={isActive ? `Pause ${automation.name}` : `Resume ${automation.name}`}
                  />
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 pl-[52px] text-[12px] leading-4">
                  <span className="min-w-0 flex-1 text-fg-muted">
                    {automation.visualPolicy === "fresh-ai"
                      ? "Fresh AI images, $0.08 per slide"
                      : "Reuses saved visuals, no image cost"}
                  </span>
                  {slideshowDeleteId === automation.id ? (
                    <span className="flex items-center gap-2.5 pointer-coarse:gap-5" role="group" aria-label={`Delete ${automation.name}?`}>
                      <span className="font-semibold text-bad">Delete?</span>
                      <button
                        type="button"
                        onClick={() => void removeSlideshow(automation)}
                        disabled={busy === automation.id}
                        className="wb-hit [--wb-hit-w:calc(100%+20px)] font-semibold text-bad underline underline-offset-2 disabled:opacity-50"
                      >
                        Yes, delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlideshowDeleteId(null)}
                        className="wb-hit [--wb-hit-w:calc(100%+20px)] font-semibold text-fg underline underline-offset-2"
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2.5 font-semibold pointer-coarse:gap-5">
                      <Link
                        href="/slideshow"
                        aria-label={`Open drafts for ${automation.name}`}
                        className="wb-hit [--wb-hit-w:calc(100%+20px)] text-fg underline underline-offset-2"
                      >
                        Drafts
                      </Link>
                      <Link
                        href={`/automations/new?workflow=slideshow&id=${encodeURIComponent(automation.id)}`}
                        aria-label={`Edit ${automation.name}`}
                        className="wb-hit [--wb-hit-w:calc(100%+20px)] text-fg underline underline-offset-2"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setSlideshowDeleteId(automation.id)}
                        aria-label={`Delete ${automation.name}`}
                        className="wb-hit [--wb-hit-w:calc(100%+20px)] text-bad underline underline-offset-2"
                      >
                        Delete
                      </button>
                    </span>
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
