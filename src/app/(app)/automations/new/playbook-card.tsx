import { Heart } from "lucide-react";
import { buttonClass } from "@/components/workbench/button";
import { Chip } from "@/components/workbench/chip";
import { iconButtonClass } from "@/components/workbench/icon-button";
import { cn } from "@/lib/utils";
import {
  templateNumber,
  type AutomationTemplate,
  type PlaybookPickerView,
} from "./playbook-model";
import { bindPlaybookHandler, PLAYBOOK_ART_NUMBER, playbookArtClass } from "./playbook-visual";

export function PlaybookCard({
  picker,
  template,
}: {
  picker: PlaybookPickerView;
  template: AutomationTemplate;
}) {
  const list = picker.view === "list";
  const favorite = picker.favorites.includes(template.id);
  const selected = picker.selectedTemplateId === template.id;

  return (
    <article
      data-chosen={selected ? "true" : undefined}
      data-playbook-card={template.id}
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden rounded-lg bg-raised",
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:opacity-0 after:shadow-[inset_0_0_0_2px_var(--pf-ember)] after:transition-opacity after:duration-[var(--pf-dur-feedback)] after:ease-pf",
        "data-[chosen=true]:after:opacity-100",
        list && "sm:flex-row"
      )}
    >
      <div
        aria-hidden="true"
        className={playbookArtClass(template.id, list ? "h-[104px] sm:h-auto sm:w-[120px]" : "h-[104px]")}
      >
        <span className={cn(PLAYBOOK_ART_NUMBER, "text-[24px] leading-7")}>
          {templateNumber(template)}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-col gap-1 px-4 pt-3.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="min-w-0 text-[14px] font-semibold leading-5 text-fg">
              {template.name}
            </h3>
            <button
              type="button"
              data-playbook-key={`favorite:${template.id}`}
              onClick={bindPlaybookHandler(picker.onToggleFavorite, template.id)}
              aria-pressed={favorite}
              aria-label={
                favorite
                  ? `Remove ${template.name} from favorites`
                  : `Add ${template.name} to favorites`
              }
              className={cn(iconButtonClass("ghost", 30), "-my-[5px] -mr-1.5 hover:bg-raised-strong")}
            >
              <Heart
                strokeWidth={1.5}
                className={cn("size-4", favorite ? "fill-current text-fg" : "text-fg-muted")}
              />
            </button>
          </div>
          <p className="text-[12px] leading-4 text-fg-muted">
            {template.category}, {template.slides} slides
          </p>
          <p className="pt-1 text-[13px] leading-[18px] text-fg-secondary">
            {template.description}
          </p>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 px-4 pb-4 pt-3.5">
          <button
            type="button"
            data-playbook-key={`preview:${template.id}`}
            onClick={bindPlaybookHandler(picker.onPreview, template.id)}
            className={buttonClass("outline", 32)}
          >
            Preview
          </button>
          <Chip
            chosen={selected}
            data-playbook-key={`select:${template.id}`}
            onClick={bindPlaybookHandler(picker.onSelect, template.id)}
            className="h-8 aria-[pressed=false]:bg-transparent aria-[pressed=false]:shadow-[inset_0_0_0_1px_var(--pf-outline)]"
          >
            {selected ? "Selected" : "Select"}
          </Chip>
        </div>
      </div>
    </article>
  );
}
