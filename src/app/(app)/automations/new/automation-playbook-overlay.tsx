import type { ReactNode } from "react";
import { Button } from "@/components/workbench/button";
import { Icon } from "@/components/workbench/icon";
import { IconButton } from "@/components/workbench/icon-button";
import {
  templateNumber,
  type AutomationTemplate,
  type PlaybookPickerState,
  type PlaybookPickerView,
} from "./playbook-model";
import { PlaybookEscape } from "./playbook-escape";
import { PlaybookPicker } from "./playbook-picker";
import { bindPlaybookHandler, playbookArtClass } from "./playbook-visual";

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
    <PlaybookOverlayShell picker={picker} selectedTemplate={selectedTemplate} onApply={onApply}>
      <PlaybookEscape onClose={picker.onClose} />
      <PlaybookPicker picker={picker} />
    </PlaybookOverlayShell>
  );
}

/**
 * Scrim, dialog, title row and footer. Rendered by the client overlay and, with
 * no handlers, by the server first paint, so both draw the same boxes.
 */
export function PlaybookOverlayShell({
  picker,
  selectedTemplate,
  onApply,
  firstPaint = false,
  children,
}: {
  picker: PlaybookPickerView;
  selectedTemplate: AutomationTemplate;
  onApply?: (templateId: string) => void;
  firstPaint?: boolean;
  children: ReactNode;
}) {
  const titleId = firstPaint ? "template-title-first-paint" : "template-title";
  return (
    <div
      data-automation-overlay="true"
      className="pf-safe-overlay fixed inset-0 z-[80] grid place-items-center bg-[var(--pf-scrim)] max-sm:p-0 max-sm:pt-[env(safe-area-inset-top)]"
      style={{ position: "fixed", inset: 0, zIndex: 80 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={
        picker.onClose
          ? (event) => {
              if (event.currentTarget === event.target) picker.onClose?.();
            }
          : undefined
      }
    >
      <div
        data-automation-dialog="true"
        className="flex h-full max-h-[860px] w-full max-w-[1180px] flex-col overflow-hidden bg-panel shadow-float max-sm:max-h-full sm:rounded-xl"
      >
        <header
          data-playbook-chrome="true"
          className="flex h-[54px] shrink-0 items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5"
        >
          <h2 id={titleId} className="wb-panel-title">
            Choose a playbook
          </h2>
          <IconButton
            icon="x"
            label="Close playbook picker"
            variant="ghost"
            className="-mr-2"
            data-playbook-key="close"
            onClick={picker.onClose}
          />
        </header>
        {children}
        <footer
          data-playbook-footer="true"
          className="flex shrink-0 flex-col gap-3 border-t border-hairline px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pb-4 sm:pt-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className={playbookArtClass(
                selectedTemplate.id,
                "grid size-9 place-items-center rounded-lg text-[13px] font-bold text-[var(--pf-on-media)]"
              )}
            >
              {templateNumber(selectedTemplate)}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="wb-label">Selected playbook</span>
              <span className="text-[14px] font-semibold leading-5 text-fg">
                {selectedTemplate.name}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5">
            <Button
              size={40}
              data-playbook-key="scratch"
              onClick={picker.onBuildFromScratch}
            >
              Build from scratch
            </Button>
            <Button size={40} data-playbook-key="cancel" onClick={picker.onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size={40}
              className="col-span-2"
              data-playbook-key="apply"
              onClick={bindPlaybookHandler(onApply, selectedTemplate.id)}
            >
              Apply playbook
              <Icon name="chevron-right" strokeWidth={2} />
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
