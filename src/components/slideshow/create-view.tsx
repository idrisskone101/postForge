"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AlignLeft, FilePlus2, LayoutGrid, Lightbulb } from "lucide-react";

import { Icon } from "@/components/workbench/icon";
import { cn } from "@/lib/utils";

import { CreateIdeaForm } from "./create-idea-form";
import { RecentDrafts } from "./recent-drafts";
import { VisualTile } from "./slide-preview";
import { useSlideshowHome } from "./slideshow-home-provider";

type CreateMode = "one-idea" | "own-copy";

export function CreateView() {
  const { templates, onCustom, onBrowseTemplates, onUseTemplate } = useSlideshowHome();
  const [mode, setMode] = useState<CreateMode>("one-idea");
  const chosen = MODES[mode];
  const other = mode === "one-idea" ? "own-copy" : "one-idea";
  const OtherIcon = MODES[other].icon;
  const ChosenIcon = chosen.icon;

  return (
    <>
      <section
        aria-label="Create a slideshow"
        className="wb-panel gap-4 px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5"
      >
        <div className="flex flex-col gap-3 xl:flex-row">
          <div
            data-slideshow-start={mode}
            className="flex min-w-0 flex-1 flex-col gap-[18px] rounded-lg p-4 shadow-[0_0_0_2px_var(--pf-ember)] sm:p-5"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ember-wash text-ember-text">
                <ChosenIcon className="size-5" strokeWidth={1.5} />
              </span>
              <h2 className="min-w-0 flex-1 text-[18px] font-bold leading-[22px] tracking-[-0.01em] text-fg">
                {chosen.title}
              </h2>
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ember text-[var(--pf-on-ember)]">
                <Icon name="check" size={13} strokeWidth={3} />
              </span>
            </div>
            {mode === "one-idea" ? <CreateIdeaForm /> : <CreatorView />}
          </div>

          <div
            className={cn(
              "flex shrink-0 flex-col gap-3 xl:w-[384px]",
              mode === "own-copy" && "xl:self-start",
            )}
          >
            <button type="button" onClick={() => setMode(other)} className={START_TILE}>
              <span className={TILE_ICON}>
                <OtherIcon className="size-5" strokeWidth={1.5} />
              </span>
              <span className={TILE_TITLE}>{MODES[other].title}</span>
            </button>
            <button type="button" onClick={onCustom} className={START_TILE}>
              <span className={TILE_ICON}>
                <FilePlus2 className="size-5" strokeWidth={1.5} />
              </span>
              <span className={TILE_TITLE}>Blank slideshow</span>
            </button>
            <div className="flex flex-col gap-3 rounded-lg bg-raised p-4">
              <button
                type="button"
                onClick={onBrowseTemplates}
                className="group flex items-center gap-3 rounded-lg text-left outline-none focus-visible:shadow-[0_0_0_2px_var(--pf-ember)]"
              >
                <span className={TILE_ICON}>
                  <LayoutGrid className="size-5" strokeWidth={1.5} />
                </span>
                <span className={TILE_TITLE}>Template library</span>
                <Icon
                  name="chevron-right"
                  size={16}
                  className="shrink-0 text-fg-muted transition-colors duration-[160ms] ease-pf group-hover:text-fg"
                />
              </button>
              <div className="grid grid-cols-4 gap-2">
                {templates.slice(0, 4).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => onUseTemplate(template)}
                    aria-label={`Use the ${template.name} template`}
                    className="group flex min-w-0 flex-col gap-1.5 rounded-sm text-left outline-none focus-visible:shadow-[0_0_0_2px_var(--pf-raised),0_0_0_4px_var(--pf-ember)]"
                  >
                    <VisualTile
                      visualKey={template.visualKeys[0] ?? "coral-glow"}
                      className="h-[92px] w-full rounded-sm transition-opacity duration-[160ms] ease-pf group-hover:opacity-80"
                    />
                    <span className="truncate text-[12px] font-semibold leading-4 text-fg">
                      {template.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <RecentDrafts />
    </>
  );
}

const MODES: Record<CreateMode, { title: string; icon: typeof Lightbulb }> = {
  "one-idea": { title: "One idea", icon: Lightbulb },
  "own-copy": { title: "Bring your own copy", icon: AlignLeft },
};

const START_TILE =
  "flex min-h-[72px] flex-1 items-center gap-3 rounded-lg bg-raised p-4 text-left outline-none transition-colors duration-[160ms] ease-pf hover:bg-raised-strong focus-visible:shadow-[0_0_0_2px_var(--pf-ember)] active:scale-[0.99]";
const TILE_ICON =
  "grid size-10 shrink-0 place-items-center rounded-lg bg-strong text-strong-fg";
const TILE_TITLE = "min-w-0 flex-1 text-[15px] font-bold leading-5 text-fg";

const CreatorView = dynamic(() =>
  import("./creator-view").then((mod) => ({ default: mod.CreatorView })),
);
