"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TEMPLATE_VISUALS,
  templateNumber,
  type AutomationTemplate,
  type PlaybookPickerState,
} from "./playbook-model";
import { PlaybookPicker } from "./playbook-picker";

export function AutomationPlaybookOverlay({
  picker,
  selectedTemplate,
  onApply,
}: {
  picker: PlaybookPickerState;
  selectedTemplate: AutomationTemplate;
  onApply: (templateId: string) => void;
}) {
  return (
    <div
      data-automation-overlay="true"
      className="pf-safe-overlay fixed inset-0 z-[80] grid place-items-center bg-black/50 backdrop-blur-sm"
      style={{ position: "fixed", inset: 0, zIndex: 80 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) picker.onClose();
      }}
    >
      <div
        data-automation-dialog="true"
        className="flex h-full max-h-[860px] w-full max-w-[1180px] flex-col overflow-hidden rounded-[12px] bg-card shadow-2xl sm:rounded-[20px]"
      >
        <PlaybookPicker picker={picker} />
        <footer
          data-playbook-footer="true"
          className="flex shrink-0 flex-col gap-3 border-t border-border bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(35,35,35,.06)] sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-lg font-serif text-[13px] font-bold italic text-white",
                TEMPLATE_VISUALS[selectedTemplate.id]
              )}
            >
              {templateNumber(selectedTemplate)}
            </span>
            <span className="min-w-0">
              <small data-playbook-lede="Selected playbook">
                <span className="sr-only">Selected playbook</span>
              </small>
              <b data-playbook-name={selectedTemplate.name}>
                <span className="sr-only">{selectedTemplate.name}</span>
              </b>
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={picker.onClose}
              data-lcp="Cancel"
              className="pf-button-secondary flex-1 sm:flex-none"
            >
              <span className="sr-only">Cancel</span>
            </button>
            <button
              type="button"
              onClick={() => onApply(selectedTemplate.id)}
              data-lcp="Apply playbook"
              className="pf-button-primary flex-1 sm:flex-none"
            >
              <span className="sr-only">Apply playbook</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
