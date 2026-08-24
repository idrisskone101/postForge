"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LayoutTemplate,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { automationDestinationLabel } from "@/lib/automations";
import { cn } from "@/lib/utils";
import { ValidationRow } from "./automation-builder-fields";
import { AutomationBuilderPhaseForm } from "./automation-builder-phase-form";
import { AutomationBuilderPreviewPane } from "./automation-builder-preview-pane";
import { PlaybookPicker } from "./playbook-picker";
import { TEMPLATE_VISUALS, templateNumber } from "./playbook-model";
import { useAutomationBuilder } from "./use-automation-builder";

export function AutomationBuilderClient() {
  const workspace = useAutomationBuilder();
  const {
    record,
    setRecord,
    phase,
    setPhase,
    phaseIndex,
    templateOpen,
    saving,
    saveFailed,
    savedRecordSignature,
    loading,
    validationOpen,
    setValidationOpen,
    error,
    setError,
    toast,
    selectedTemplate,
    recordSignature,
    destinationReadiness,
    saveStatus,
    socialApprovalMissing,
    applyTemplate,
    openTemplatePicker,
    persist,
    integrationsLoading,
    playbookPicker,
    PHASES,
  } = workspace;

  if (loading) {
    return (
      <div
        data-automation-builder="true"
        className="pf-content-viewport flex flex-col bg-[var(--pf-canvas)]"
        aria-busy="true"
      >
        <header className="flex h-[82px] shrink-0 items-center border-b border-border bg-[var(--pf-active)] px-4 sm:px-6" />
        <div className="h-[59px] shrink-0 border-b border-[var(--pf-border)] bg-white" />
        <section className="min-h-0 flex-1" />
      </div>
    );
  }

  return (
    <div data-automation-builder="true" className="pf-content-viewport flex flex-col bg-[var(--pf-canvas)]">
      <header className="flex h-[82px] items-center justify-between gap-3 overflow-x-auto border-b border-border bg-[var(--pf-active)] px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/automations" aria-label="Back to automations" className="grid size-9 place-items-center rounded-lg border border-border bg-white">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <input
              value={record.name}
              onChange={(event) => setRecord((current) => ({ ...current, name: event.target.value }))}
              className="mt-1 w-full min-w-0 bg-transparent text-[15px] font-semibold tracking-[-0.01em] outline-none"
              aria-label="Automation name"
            />
          </div>
          <span className="rounded-full bg-[var(--pf-active)] px-2 py-1 text-[12px] font-bold text-muted-foreground">
            {record.status.replace("_", " ").toUpperCase()}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span
            role="status"
            aria-live="polite"
            className={cn(
              "mr-1 text-[12px] font-medium",
              saveFailed
                ? "text-[var(--pf-danger)]"
                : savedRecordSignature === recordSignature
                  ? "text-[var(--pf-success)]"
                  : "text-muted-foreground"
            )}
          >
            {saveStatus}
          </span>
          <button onClick={openTemplatePicker} className="pf-button-secondary">
            <LayoutTemplate className="size-3.5" /> Playbook
          </button>
          <button onClick={() => persist("draft")} disabled={saving} className="pf-button-secondary">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save draft
          </button>
          <button onClick={() => setValidationOpen(true)} className="pf-button-primary">
            Review automation <ArrowRight className="size-3.5" />
          </button>
        </div>
      </header>

      <div className="flex min-h-[59px] items-center justify-between gap-4 overflow-x-auto border-b border-[var(--pf-border)] bg-white px-3 sm:px-6">
        <div className="flex h-[59px]">
          {PHASES.map((item, index) => (
            <button
              key={item}
              onClick={() => setPhase(item)}
              className={cn(
                "relative grid min-w-[118px] grid-cols-[24px_1fr] items-center gap-2 px-3 text-left text-[12px] font-semibold text-muted-foreground",
                phase === item &&
                  "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--pf-orange)]"
              )}
            >
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full bg-[var(--pf-active)] text-[12px]",
                  phase === item && "bg-[var(--pf-orange)] text-white"
                )}
              >
                0{index + 1}
              </span>
              <span>
                {item}
                <small className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                  {phase === item ? "Editing" : index < phaseIndex ? "Complete" : ""}
                </small>
              </span>
            </button>
          ))}
        </div>
        <span className="hidden rounded-full bg-[var(--pf-active)] px-2.5 py-1 text-[12px] text-muted-foreground sm:block">
          {record.template.replaceAll("-", " ")}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="mx-4 mt-3 flex min-w-0 items-start justify-between gap-3 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] text-[var(--pf-danger)] sm:mx-6"
        >
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0" aria-label="Dismiss error">
            <X className="size-3.5 shrink-0" />
          </button>
        </div>
      )}

      <section className="grid min-h-0 flex-1 lg:grid-cols-[340px_minmax(0,1fr)]">
        <AutomationBuilderPhaseForm workspace={workspace} />
        <AutomationBuilderPreviewPane workspace={workspace} />
      </section>

      {templateOpen && (
        <div
          className="pf-safe-overlay fixed inset-0 z-[80] grid place-items-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) playbookPicker.onClose();
          }}
        >
          <div className="flex h-full max-h-[860px] w-full max-w-[1180px] flex-col overflow-hidden rounded-[12px] bg-card shadow-2xl sm:rounded-[20px]">
            <PlaybookPicker picker={playbookPicker} />
            <footer className="flex shrink-0 flex-col gap-3 border-t border-border bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(35,35,35,.06)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
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
                  <small className="block text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
                    Selected playbook
                  </small>
                  <b className="mt-0.5 block truncate text-[12px]">{selectedTemplate.name}</b>
                </span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={playbookPicker.onClose} className="pf-button-secondary flex-1 sm:flex-none">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate(selectedTemplate.id)}
                  className="pf-button-primary flex-1 sm:flex-none"
                >
                  Apply playbook <ArrowRight className="size-3.5" />
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}

      {validationOpen && (
        <div
          className="pf-safe-overlay fixed inset-0 z-[85] grid min-w-0 place-items-center bg-black/45 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-full w-full min-w-0 max-w-[390px] overflow-y-auto rounded-[12px] bg-white p-6 text-center shadow-2xl">
            <span
              className={cn(
                "mx-auto grid size-11 shrink-0 place-items-center rounded-full",
                socialApprovalMissing
                  ? "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
                  : "bg-[var(--pf-success)]/10 text-[var(--pf-success)]"
              )}
            >
              {socialApprovalMissing ? <X className="size-5 shrink-0" /> : <Check className="size-5 shrink-0" />}
            </span>
            <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.02em]">
              {socialApprovalMissing ? "Approval is required" : "Creative setup looks good"}
            </h2>
            <p className="mt-1 min-w-0 break-words text-[11px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">
              Saving creates a paused plan. Manual Review queue schedules can create local drafts. Social publishing stays separate and requires an approved Gallery video, a live provider check, and explicit confirmation for every post.
            </p>
            <div className="my-5 min-w-0 space-y-2 text-left text-[11px]">
              <ValidationRow ok text="Hook, content, and CTA configured" />
              <ValidationRow
                ok={record.destination === "manual" || record.approvalRequired}
                text={
                  record.destination === "manual"
                    ? "Local review plan"
                    : record.approvalRequired
                      ? "Approval required before any provider handoff"
                      : "Social handoffs require approval"
                }
              />
              <ValidationRow
                ok={record.destination === "manual" || (!integrationsLoading && destinationReadiness.ready)}
                text={
                  record.destination !== "manual" && integrationsLoading
                    ? `Checking ${automationDestinationLabel(record.destination)} connection readiness`
                    : destinationReadiness.message
                }
              />
            </div>
            <div className="flex min-w-0 flex-col-reverse justify-center gap-2 min-[420px]:flex-row">
              <button onClick={() => setValidationOpen(false)} className="pf-button-secondary shrink-0">
                Return to setup
              </button>
              <button
                onClick={() => {
                  setValidationOpen(false);
                  persist("create");
                }}
                disabled={saving || socialApprovalMissing}
                className="pf-button-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saving ? <Loader2 className="size-3.5 shrink-0 animate-spin" /> : <Save className="size-3.5 shrink-0" />}{" "}
                {record.destination !== "manual" && !destinationReadiness.ready
                  ? "Save for connection"
                  : "Save reviewed plan"}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div
          role="status"
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[90] flex min-w-0 items-center gap-2 rounded-lg bg-foreground px-3 py-2.5 text-[12px] font-medium text-white shadow-xl sm:left-auto sm:max-w-[420px]"
        >
          <Check className="size-3.5 shrink-0 text-[var(--pf-success)]" />
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{toast}</span>
        </div>
      )}
    </div>
  );
}
