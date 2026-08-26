"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  FileImage,
  Plus,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { cn } from "@/lib/utils";

import { VisualTile } from "./slide-preview";
import { CreateIdeaForm } from "./create-idea-form";
import { CARD, CARD_HOVER } from "./studio-ui";
import { useSlideshowHome } from "./slideshow-home-provider";

export function CreateView() {
  const paintReady = useWindowLoadReady();
  const home = useSlideshowHome();
  const { templates, onCustom, onBrowseTemplates } = home;
  const [mode, setMode] = useState<"one-idea" | "own-copy">("one-idea");

  return (
    <div data-slideshow-create={paintReady ? undefined : "true"}>
      <div className="mb-4 flex h-10 items-center gap-1 overflow-hidden rounded-lg bg-[var(--pf-active)] p-1 sm:w-fit">
        <button
          type="button"
          onClick={() => setMode("one-idea")}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition",
            mode === "one-idea"
              ? "bg-card text-foreground shadow-[var(--pf-shadow-2xs)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className="size-3.5" /> One idea
        </button>
        <button
          type="button"
          onClick={() => setMode("own-copy")}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition",
            mode === "own-copy"
              ? "bg-card text-foreground shadow-[var(--pf-shadow-2xs)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <WandSparkles className="size-3.5" /> Bring your own copy
        </button>
      </div>

      {mode === "own-copy" ? (
        <CreatorView />
      ) : (
        <div
          className="grid gap-4 lg:grid-cols-[minmax(0,1.32fr)_minmax(300px,0.68fr)]"
          data-slideshow-idea-grid={paintReady ? undefined : "true"}
        >
          <CreateIdeaForm />

          <div className="grid gap-4" data-slideshow-idea-sidebar={paintReady ? undefined : "true"}>
            <button
              type="button"
              onClick={onCustom}
              className={cn(CARD, CARD_HOVER, "group flex items-center gap-3.5 p-4 text-left")}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-[6px] border border-dashed border-[var(--pf-border-strong)] text-muted-foreground transition-colors group-hover:border-[var(--pf-orange)] group-hover:text-[var(--pf-orange)]">
                <Plus className="size-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-foreground">Blank slideshow</span>
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                  Empty canvas, full control of every slide.
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </button>

            <button
              type="button"
              onClick={onBrowseTemplates}
              className={cn(CARD, CARD_HOVER, "group flex-1 p-4 text-left")}
            >
              <span className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-[6px] bg-[var(--pf-active)] text-muted-foreground transition-colors group-hover:bg-[var(--pf-orange)]/10 group-hover:text-[var(--pf-orange)]">
                  <FileImage className="size-4.5" />
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </span>
              <span className="mt-3 block text-[13px] font-semibold text-foreground">Template library</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                {templates.length} ready-to-use templates with hook, structure, and visual direction.
              </span>
              <span className="mt-3 grid grid-cols-3 gap-1">
                {(templates[0]?.visualKeys ?? ["coral-glow", "blue-studio", "mint-room"]).map(
                  (visualKey, index) => (
                    <VisualTile
                      key={`${visualKey}-${index}`}
                      visualKey={visualKey}
                      className="h-10 rounded-[6px]"
                    />
                  ),
                )}
              </span>
            </button>
          </div>
        </div>
      )}
      <CreateTemplateGallery />
    </div>
  );
}

const CreatorView = dynamic(() =>
  import("./creator-view").then((mod) => ({ default: mod.CreatorView })),
);

const CreateTemplateGallery = dynamic(
  () =>
    import("./create-template-gallery").then((mod) => ({
      default: mod.CreateTemplateGallery,
    })),
  { ssr: true },
);
