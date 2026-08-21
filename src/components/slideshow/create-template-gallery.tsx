"use client";

import { ArrowRight, Workflow } from "lucide-react";

import { cn } from "@/lib/utils";

import { useSlideshowHome } from "./slideshow-home-provider";
import {
  CARD,
  CARD_HOVER,
  SECONDARY_BTN,
} from "./studio-ui";
import { TemplateMinis } from "./template-minis";

export function CreateTemplateGallery() {
  const { templates, onBrowseTemplates, onUseTemplate } = useSlideshowHome();
  return (
    <>
      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            Templates
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Swap the idea, imagery, and voice. Keep the structure.
          </p>
        </div>
        <button type="button" onClick={onBrowseTemplates} className={SECONDARY_BTN}>
          All templates
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.slice(0, 6).map((template) => (
          <article key={template.id} className={cn(CARD, CARD_HOVER, "group overflow-hidden")}>
            <div className="p-3 pb-0">
              <TemplateMinis template={template} />
            </div>
            <div className="flex items-end justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-foreground">{template.name}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {template.category} · {template.slides.length} slides
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUseTemplate(template)}
                className={cn(SECONDARY_BTN, "shrink-0 group-hover:border-[var(--pf-orange)] group-hover:text-[var(--pf-orange)]")}
              >
                Use format
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-[6px] border border-border bg-[var(--pf-active)] p-3.5">
        <Workflow className="size-4 shrink-0 text-muted-foreground" />
        <p className="text-[12px] leading-4 text-muted-foreground">
          Scheduled slideshow runs are managed in Automations, and slide imagery lives in Collections, so every tool shares the same library.
        </p>
      </div>
    </>
  );
}
