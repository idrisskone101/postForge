"use client";

import Link from "next/link";
import { Edit3, Layers, Trash2 } from "lucide-react";
import { VisualTile } from "@/components/slideshow/slide-preview";
import {
  Button,
  EmptyState,
  Icon,
  Toggle,
  buttonClass,
} from "@/components/workbench";
import { slideshowNextRunLabel, visualPolicyCopy } from "./hub-visual";
import { RowActionsMenu, menuDangerItemClass, menuItemClass } from "./row-actions-menu";
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
    menu,
    setMenu,
    load,
    toggleSlideshow,
    removeSlideshow,
  } = hub;

  return (
    <section className="flex min-w-0 shrink-0 flex-col gap-1.5 rounded-xl bg-panel p-5 shadow-panel min-[1380px]:w-[340px]">
      <div className="flex items-center justify-between gap-3 pb-2">
        <h2 className="wb-panel-title min-w-0">Carousel draft schedules</h2>
        <Link href="/automations/new?workflow=slideshow" className={buttonClass("quiet", 32)}>
          New
        </Link>
      </div>

      {slideshowError ? (
        <div role="alert" className="wb-notice" data-tone="bad">
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            <strong className="font-semibold text-bad">Schedules did not load.</strong> {slideshowError}
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
            const policy = visualPolicyCopy(automation.visualPolicy);
            const menuId = `carousel:${automation.id}`;
            const confirming = slideshowDeleteId === automation.id;
            return (
              <div
                key={automation.id}
                data-carousel-row="true"
                className="flex min-h-[77px] min-w-0 items-center gap-3 border-b border-hairline py-2.5 last:border-b-0"
              >
                <VisualTile
                  visualKey={automation.visualKey ?? "coral-glow"}
                  className="h-[50px] w-10 shrink-0 rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="wb-row-title line-clamp-2 whitespace-normal [overflow-wrap:anywhere]" title={automation.name}>
                    {automation.name}
                  </p>
                  <p className="wb-row-sub truncate" title={policy.full}>
                    {policy.short}
                  </p>
                  <p className="flex items-center gap-1.5 pt-0.5" title={automation.cadence}>
                    <Icon name="clock" size={12} className="shrink-0 text-fg-muted" />
                    <span className="wb-mono truncate text-fg">
                      {slideshowNextRunLabel({
                        active: isActive,
                        nextRunAt: automation.nextRunAt,
                      })}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Toggle
                    checked={isActive}
                    disabled={busy === automation.id}
                    onCheckedChange={() => void toggleSlideshow(automation)}
                    label={isActive ? `Pause ${automation.name}` : `Resume ${automation.name}`}
                  />
                  <RowActionsMenu
                    label={`Actions for ${automation.name}`}
                    open={menu === menuId}
                    onOpenChange={(open) => {
                      setMenu(open ? menuId : null);
                      setSlideshowDeleteId(null);
                    }}
                  >
                    {confirming ? (
                      <div role="group" aria-label={`Delete ${automation.name}?`} className="flex flex-col gap-1">
                        <p className="px-2.5 py-2 text-[12px] leading-4 text-fg-secondary">
                          Delete this schedule? Drafts it already made are kept.
                        </p>
                        <button
                          type="button"
                          role="menuitem"
                          disabled={busy === automation.id}
                          onClick={() => {
                            setMenu(null);
                            void removeSlideshow(automation);
                          }}
                          className={menuDangerItemClass}
                        >
                          <Trash2 className="size-4 shrink-0" strokeWidth={1.5} /> Yes, delete
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => setSlideshowDeleteId(null)}
                          className={menuItemClass}
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <>
                        <Link href="/slideshow" role="menuitem" className={menuItemClass}>
                          <Layers className="size-4 shrink-0" strokeWidth={1.5} /> Drafts
                        </Link>
                        <Link
                          href={`/automations/new?workflow=slideshow&id=${encodeURIComponent(automation.id)}`}
                          role="menuitem"
                          className={menuItemClass}
                        >
                          <Edit3 className="size-4 shrink-0" strokeWidth={1.5} /> Edit
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => setSlideshowDeleteId(automation.id)}
                          className={menuDangerItemClass}
                        >
                          <Trash2 className="size-4 shrink-0" strokeWidth={1.5} /> Delete
                        </button>
                      </>
                    )}
                  </RowActionsMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
