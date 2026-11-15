"use client";

import { useMemo, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";
import { Icon } from "@/components/workbench/icon";
import { IconButton } from "@/components/workbench/icon-button";

import { VisualTile } from "./slide-preview";
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
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(92dvh,720px)] flex-col gap-4 overflow-hidden sm:max-w-[min(760px,calc(100vw-2rem))]"
      >
        <div className="flex items-center justify-between gap-3">
          <DialogTitle className="text-[18px] font-bold leading-[22px] tracking-[-0.01em] text-fg">
            Template library
          </DialogTitle>
          <IconButton icon="x" label="Close" size={30} onClick={() => onOpenChange(false)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="wb-input-wrap min-w-[180px] flex-1" data-size="36">
            <Icon name="search" size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search formats"
              aria-label="Search formats"
            />
          </label>
          <Button variant="strong" onClick={onCustom}>
            <Icon name="plus" size={16} strokeWidth={2} />
            Blank slideshow
          </Button>
        </div>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1">
          {visible.length ? (
            <ul className="@container grid gap-3 sm:grid-cols-2">
              {visible.map((template) => (
                <li
                  key={template.id}
                  // Below 300px of list width the copy has no room beside the thumbnails, so it takes its own row.
                  className="flex min-w-0 items-center gap-3 rounded-lg bg-raised p-3 @max-[300px]:grid @max-[300px]:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <span className="flex shrink-0 gap-[3px]">
                    {template.visualKeys.slice(0, 3).map((visualKey, index) => (
                      <VisualTile
                        key={`${visualKey}-${index}`}
                        visualKey={visualKey}
                        className="h-[60px] w-[34px] rounded-sm"
                      />
                    ))}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px] @max-[300px]:col-span-2 @max-[300px]:row-start-2">
                    <span className="break-words text-[14px] font-semibold leading-[18px] text-fg">
                      {template.name}
                    </span>
                    <span className="break-words text-[13px] leading-4 text-fg-secondary">
                      {template.category} - {template.slides.length} slides
                    </span>
                  </span>
                  <Button
                    variant="strong"
                    size={32}
                    className="@max-[300px]:col-start-2 @max-[300px]:row-start-1"
                    onClick={() => onUseTemplate(template)}
                    aria-label={`Use the ${template.name} template`}
                  >
                    Use
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="search" title="No formats match">
              <Button onClick={() => setQuery("")}>Clear search</Button>
            </EmptyState>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
