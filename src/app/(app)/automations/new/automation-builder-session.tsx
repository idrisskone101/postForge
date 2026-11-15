"use client";

import {
  Icon,
  IconButton,
  PageHeader,
  StatusChip,
  Toast,
} from "@/components/workbench";
import { cn } from "@/lib/utils";
import { AutomationBuilderPhaseFormLazy } from "./automation-builder-phase-form-lazy";
import { AutomationBuilderPreviewPaneLazy } from "./automation-builder-preview-pane-lazy";
import { AutomationBuilderSkeleton } from "./automation-builder-skeleton";
import { AutomationPlaybookOverlay } from "./automation-playbook-overlay";
import type { AutomationBuilderSearch } from "./automation-builder-search";
import { useAutomationBuilder } from "./use-automation-builder";

export function AutomationBuilderSession({
  search,
}: {
  search: AutomationBuilderSearch;
}) {
  const workspace = useAutomationBuilder(search);
  const {
    record,
    setRecord,
    templateOpen,
    saveFailed,
    loading,
    error,
    setError,
    toast,
    selectedTemplate,
    saveStatus,
    applyTemplate,
    playbookPicker,
  } = workspace;

  if (loading) {
    return (
      <div data-automation-builder="true" aria-busy="true" className="flex min-h-0 flex-1 flex-col">
        <AutomationBuilderSkeleton />
      </div>
    );
  }

  return (
    <div
      data-automation-builder="true"
      data-picker-open={templateOpen ? "true" : undefined}
      className="flex min-h-0 flex-1 flex-col gap-3"
    >
      <PageHeader
        back={{ href: "/automations", label: "Back to automations" }}
        title={
          <label className="flex min-w-0 items-start gap-2 pl-2 leading-[34px]">
            <span className="sr-only">{record.name || "Untitled automation"}</span>
            <span className="-mx-2 grid min-w-[4ch] max-w-full">
              <span aria-hidden="true" className={cn(NAME_BOX, "invisible overflow-hidden")}>
                {record.name || NAME_PLACEHOLDER}
              </span>
              <textarea
                rows={1}
                value={record.name}
                onChange={(event) =>
                  setRecord((current) => ({ ...current, name: event.target.value.replace(/\n/g, " ") }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
                className={cn(
                  NAME_BOX,
                  "size-full resize-none overflow-hidden rounded-lg bg-transparent font-[inherit] tracking-[inherit] text-fg outline-none transition-shadow duration-[var(--pf-dur-feedback)] ease-pf placeholder:text-fg-muted focus-visible:shadow-[inset_0_0_0_2px_var(--pf-ember)]"
                )}
                placeholder={NAME_PLACEHOLDER}
                aria-label="Automation name"
              />
            </span>
            <Icon name="pencil" className="mt-2 shrink-0 text-fg-muted" />
          </label>
        }
      >
        <StatusChip tone={record.status === "active" ? "ok" : record.status === "needs_connection" ? "warn" : "neutral"}>
          {statusWord(record.status)}
        </StatusChip>
        <span
          role="status"
          aria-live="polite"
          className={cn("shrink-0 text-[13px] leading-[18px]", saveFailed ? "text-bad" : "text-fg-muted")}
        >
          {saveStatus}
        </span>
      </PageHeader>

      {error && (
        <div role="alert" className="wb-notice shrink-0" data-tone="bad">
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{error}</span>
          <IconButton icon="x" size={28} variant="ghost" label="Dismiss error" onClick={() => setError(null)} />
        </div>
      )}

      <div data-automation-workspace="true" className="flex min-h-0 flex-1 flex-col gap-3 xl:flex-row">
        <AutomationBuilderPhaseFormLazy workspace={workspace} />
        <AutomationBuilderPreviewPaneLazy workspace={workspace} />
      </div>

      {templateOpen && (
        <AutomationPlaybookOverlay
          picker={playbookPicker}
          selectedTemplate={selectedTemplate}
          onApply={applyTemplate}
        />
      )}

      {toast && (
        <div className="wb-toast-region">
          <Toast toast={{ id: toast, tone: "ok", message: toast }} onDismiss={keepToast} />
        </div>
      )}
    </div>
  );
}

const NAME_PLACEHOLDER = "Name this automation";

/**
 * The name field and the hidden copy that sizes it share one grid cell, so the field is as wide as its
 * text and as tall as the lines a long name wraps to. An input would cut the name instead.
 */
const NAME_BOX =
  "col-start-1 row-start-1 min-w-0 whitespace-pre-wrap px-2 [overflow-wrap:anywhere]";

function statusWord(status: string) {
  const words = status.replace("_", " ");
  return words[0].toUpperCase() + words.slice(1);
}

// The builder hook clears its own toast; the primitive's dismiss has nothing left to remove.
function keepToast() {}
