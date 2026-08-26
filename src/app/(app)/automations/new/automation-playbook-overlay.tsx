"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { AutomationsPaintText } from "../automations-paint-text";
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
  const paintReady = useWindowLoadReady();

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
        className="flex h-full max-h-[860px] w-full max-w-[1180px] flex-col overflow-hidden rounded-[12px] bg-[var(--pf-surface)] shadow-[var(--pf-shadow-lg)] sm:rounded-[20px]"
      >
        <PlaybookPicker picker={picker} />
        <footer
          data-playbook-footer="true"
          className="flex shrink-0 flex-col gap-3 border-t border-[var(--pf-border)] bg-[var(--pf-surface)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[var(--pf-shadow-lg)] sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-[8px] font-serif text-[13px] font-bold italic text-white",
                TEMPLATE_VISUALS[selectedTemplate.id]
              )}
            >
              {templateNumber(selectedTemplate)}
            </span>
            <span className="min-w-0">
              <AutomationsPaintText
                ready={paintReady}
                liveAs="span"
                liveClassName="block text-[11px] text-[var(--pf-muted)] [overflow-wrap:anywhere]"
                paint={
                  <small data-playbook-lede="Selected playbook" className="text-[var(--pf-muted)]">
                    <span className="sr-only">Selected playbook</span>
                  </small>
                }
              >
                Selected playbook
              </AutomationsPaintText>
              <AutomationsPaintText
                ready={paintReady}
                liveAs="span"
                liveClassName="block text-[13px] font-semibold text-[var(--pf-ink)] [overflow-wrap:anywhere]"
                paint={
                  <b data-playbook-name={selectedTemplate.name} className="text-[var(--pf-ink)]">
                    <span className="sr-only">{selectedTemplate.name}</span>
                  </b>
                }
              >
                {selectedTemplate.name}
              </AutomationsPaintText>
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={picker.onClose}
              className="pf-button-secondary flex-1 sm:flex-none"
            >
              <AutomationsPaintText
                ready={paintReady}
                liveAs="span"
                liveClassName="whitespace-normal [overflow-wrap:anywhere]"
                paint={
                  <span data-lcp="Cancel">
                    <span className="sr-only">Cancel</span>
                  </span>
                }
              >
                Cancel
              </AutomationsPaintText>
            </button>
            <button
              type="button"
              onClick={() => onApply(selectedTemplate.id)}
              className="pf-button-primary flex-1 sm:flex-none"
            >
              <AutomationsPaintText
                ready={paintReady}
                liveAs="span"
                liveClassName="whitespace-normal [overflow-wrap:anywhere]"
                paint={
                  <span data-lcp="Apply playbook">
                    <span className="sr-only">Apply playbook</span>
                  </span>
                }
              >
                Apply playbook
              </AutomationsPaintText>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
