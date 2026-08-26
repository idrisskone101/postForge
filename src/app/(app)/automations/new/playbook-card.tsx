"use client";

import { Check, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { AutomationsPaintText } from "../automations-paint-text";
import {
  TEMPLATE_VISUALS,
  templateNumber,
  type AutomationTemplate,
  type PlaybookPickerState,
} from "./playbook-model";
import {
  playbookCardShellClass,
  playbookSelectButtonClass,
} from "./playbook-visual";

export function PlaybookCard({
  picker,
  template,
}: {
  picker: PlaybookPickerState;
  template: AutomationTemplate;
}) {
  const view = picker.view;
  const favorite = picker.favorites.includes(template.id);
  const selected = picker.selectedTemplateId === template.id;
  const previewing = picker.previewTemplate.id === template.id;
  const paintReady = useWindowLoadReady();

  return (
    <article className={playbookCardShellClass(selected, previewing, view === "list")}>
      <div
        className={cn(
          "relative overflow-hidden",
          TEMPLATE_VISUALS[template.id],
          view === "grid" ? "h-28" : "h-28 sm:h-full sm:min-h-[138px]"
        )}
      >
        <span className="absolute left-4 top-4 font-serif text-2xl font-bold italic text-white">
          {templateNumber(template)}
        </span>
        <span className="absolute bottom-2 left-3 rounded-full bg-black/65 px-2 py-1 text-[11px] text-white">
          {template.slides} slides
        </span>
        <button
          type="button"
          onClick={() => picker.onToggleFavorite(template.id)}
          aria-label={
            favorite
              ? `Remove ${template.name} from favorites`
              : `Add ${template.name} to favorites`
          }
          aria-pressed={favorite}
          className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-[var(--pf-surface)]/90 text-[var(--pf-ink)] shadow-[var(--pf-shadow-2xs)] hover:bg-[var(--pf-surface)]"
        >
          <Heart className={cn("size-3.5", favorite && "fill-[var(--pf-orange)] text-[var(--pf-orange)]")} />
        </button>
      </div>
      <div className="flex min-w-0 flex-col p-3">
        <span className="text-[11px] font-bold uppercase tracking-[.09em] text-[var(--pf-muted)]">
          {template.category}
        </span>
        <div className="mt-1 flex items-start justify-between gap-2">
          <AutomationsPaintText
            ready={paintReady}
            liveAs="span"
            liveClassName="min-w-0 text-[13px] font-semibold text-[var(--pf-ink)] [overflow-wrap:anywhere]"
            paint={
              <h3 data-playbook-name={template.name} className="text-[13px] font-semibold text-[var(--pf-ink)]">
                <span className="sr-only">{template.name}</span>
              </h3>
            }
          >
            {template.name}
          </AutomationsPaintText>
          {selected && <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--pf-success)]" aria-label="Selected" />}
        </div>
        <AutomationsPaintText
          ready={paintReady}
          liveAs="span"
          liveClassName="mt-1 min-h-8 text-[12px] leading-4 text-[var(--pf-muted)] [overflow-wrap:anywhere]"
          paint={
            <p
              data-playbook-blurb={template.description}
              className="mt-1 min-h-8 text-[12px] leading-4 text-[var(--pf-muted)]"
            >
              <span className="sr-only">{template.description}</span>
            </p>
          }
        >
          {template.description}
        </AutomationsPaintText>
        <div className="mt-3 flex items-center gap-2 border-t border-[var(--pf-border)] pt-2">
          <button
            type="button"
            onClick={() => picker.onPreview(template.id)}
            className="h-7 flex-1 rounded-[8px] border border-[var(--pf-border)] text-[12px] font-semibold hover:bg-[var(--pf-active)]"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => picker.onSelect(template.id)}
            className={playbookSelectButtonClass(selected)}
          >
            {selected && <Check className="size-2.5" />}
            {selected ? "Selected" : "Select"}
          </button>
        </div>
      </div>
    </article>
  );
}
