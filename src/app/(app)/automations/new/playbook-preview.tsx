import { KeyValueList } from "@/components/workbench/key-value-list";
import { cn } from "@/lib/utils";
import { templateNumber, type AutomationTemplate } from "./playbook-model";
import { PLAYBOOK_ART_NUMBER, playbookArtClass } from "./playbook-visual";

export function PlaybookPreview({ template }: { template: AutomationTemplate }) {
  return (
    <aside
      aria-label="Playbook preview"
      aria-live="polite"
      data-playbook-preview="true"
      className="wb-well shrink-0 flex-col items-stretch justify-start gap-3.5 p-5 lg:order-last lg:w-[320px] lg:overflow-y-auto"
    >
      <div
        aria-hidden="true"
        className={playbookArtClass(template.id, "hidden h-[148px] rounded-lg lg:block")}
      >
        <span className={cn(PLAYBOOK_ART_NUMBER, "text-[28px] leading-8")}>
          {templateNumber(template)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="wb-panel-title">{template.name}</h3>
        <p className="text-[14px] leading-[21px] text-fg-secondary">{template.description}</p>
      </div>
      <KeyValueList
        rows={[
          { label: "Category", value: template.category },
          { label: "Slides", value: template.slides },
          { label: "Hook", value: template.hook },
          { label: "Structure", value: template.structure },
          { label: "Close", value: template.cta },
        ]}
      />
    </aside>
  );
}
