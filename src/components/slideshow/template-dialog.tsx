"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { VisualTile } from "./slide-preview";
import {
  CARD,
  CARD_HOVER,
  INPUT,
  SECONDARY_BTN,
} from "./studio-ui";
import type { SlideshowTemplate } from "./types";

export function TemplateDialog({
  open,
  templates,
  onOpenChange,
  onCustom,
  onUseTemplate,
}: {
  open: boolean;
  templates: SlideshowTemplate[];
  onOpenChange: (open: boolean) => void;
  onCustom: () => void;
  onUseTemplate: (template: SlideshowTemplate) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? templates.filter((template) =>
          [template.name, template.category, template.hook]
            .join(" ")
            .toLowerCase()
            .includes(normalized),
        )
      : templates;
  }, [query, templates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl! overflow-hidden rounded-lg border-border p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-14">
          <DialogTitle className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            Template library
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground">
            Start from a proven format or a blank slideshow.
          </DialogDescription>
        </DialogHeader>
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search formats"
                className={cn(INPUT, "h-9 pl-9")}
              />
            </div>
            <button type="button" onClick={onCustom} className="pf-button-primary">
              <Plus className="size-3.5" />
              Blank
            </button>
          </div>
        </div>
        <div className="max-h-[64vh] overflow-y-auto p-4">
          {visible.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((template) => (
                <article
                  key={template.id}
                  className={cn(CARD, CARD_HOVER, "flex items-center gap-3 p-3")}
                >
                  <div className="grid w-24 shrink-0 grid-cols-3 gap-0.5">
                    {template.visualKeys.map((visualKey, index) => (
                      <VisualTile
                        key={`${visualKey}-${index}`}
                        visualKey={visualKey}
                        className="aspect-[9/16] rounded-[4px]"
                      />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-foreground">{template.name}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {template.category} · {template.slides.length} slides
                    </p>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">{template.hook}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUseTemplate(template)}
                    className={cn(SECONDARY_BTN, "shrink-0")}
                  >
                    Use
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-40 place-items-center rounded-[6px] border border-dashed border-[var(--pf-border-strong)] text-center">
              <div>
                <Search className="mx-auto size-4 text-muted-foreground" />
                <p className="mt-2 text-[12px] font-semibold text-foreground">No formats match</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Try a niche or a hook phrase.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
