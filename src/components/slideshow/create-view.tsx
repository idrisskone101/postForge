"use client";

import { Suspense, lazy, useEffect, useState, useTransition } from "react";

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
  const [, startTransition] = useTransition();
  useEffect(() => {
    const timer = window.setTimeout(loadCreatorView, 1200);
    return () => window.clearTimeout(timer);
  }, []);
  const chosen = MODES[mode];
  const other = mode === "one-idea" ? "own-copy" : "one-idea";

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
                <StartIcon name={mode} />
              </span>
              <h2 className="min-w-0 flex-1 text-[18px] font-bold leading-[22px] tracking-[-0.01em] text-fg">
                {chosen.title}
              </h2>
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ember text-[var(--pf-on-ember)]">
                <Icon name="check" size={13} strokeWidth={3} />
              </span>
            </div>
            <Suspense fallback={null}>
              {mode === "one-idea" ? <CreateIdeaForm /> : <CreatorView />}
            </Suspense>
          </div>

          <div
            className={cn(
              "flex shrink-0 flex-col gap-3 xl:w-[384px]",
              mode === "own-copy" && "xl:self-start",
            )}
          >
            <button
              type="button"
              onPointerEnter={loadCreatorView}
              onFocus={loadCreatorView}
              onClick={() => startTransition(() => setMode(other))}
              className={START_TILE}
            >
              <span className={TILE_ICON}>
                <StartIcon name={other} />
              </span>
              <span className={TILE_TITLE}>{MODES[other].title}</span>
            </button>
            <button type="button" onClick={onCustom} className={START_TILE}>
              <span className={TILE_ICON}>
                <StartIcon name="blank" />
              </span>
              <span className={TILE_TITLE}>Blank slideshow</span>
            </button>
            <div className="flex flex-col gap-3 rounded-lg bg-raised p-4">
              <button
                type="button"
                onClick={onBrowseTemplates}
                className="group flex items-center gap-3 rounded-lg text-left outline-none focus-visible:shadow-[0_0_0_2px_var(--pf-ember)]"
              >
                <span
                  className={cn(
                    TILE_ICON,
                    "transition-colors duration-[160ms] ease-pf group-hover:bg-[var(--pf-strong-hover)]",
                  )}
                >
                  <StartIcon name="templates" />
                </span>
                <span className={TILE_TITLE}>Template library</span>
              </button>
              <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-4">
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
                    <span className="line-clamp-2 break-words text-[12px] font-semibold leading-4 text-fg">
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

const MODES: Record<CreateMode, { title: string }> = {
  "one-idea": { title: "One idea" },
  "own-copy": { title: "Bring your own copy" },
};

const START_ICONS = {
  "one-idea": (
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
  ),
  "own-copy": <path d="M5 6h14M5 10.5h14M5 15h9M5 19.5h6" />,
  blank: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="2.5" />
      <path d="M12 9.5v5M9.5 12h5" />
    </>
  ),
  templates: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
};

function StartIcon({ name }: { name: keyof typeof START_ICONS }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {START_ICONS[name]}
    </svg>
  );
}

const START_TILE =
  "flex min-h-[72px] flex-1 items-center gap-3 rounded-lg bg-raised p-4 text-left outline-none transition-colors duration-[160ms] ease-pf hover:bg-raised-strong focus-visible:shadow-[0_0_0_2px_var(--pf-ember)] active:scale-[0.99]";
const TILE_ICON =
  "grid size-10 shrink-0 place-items-center rounded-lg bg-strong text-strong-fg";
const TILE_TITLE = "min-w-0 flex-1 text-[15px] font-bold leading-5 text-fg";

function loadCreatorView() {
  return import("./creator-view").then((mod) => ({ default: mod.CreatorView }));
}

const CreatorView = lazy(loadCreatorView);
