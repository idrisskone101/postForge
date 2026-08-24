"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ImageIcon, Sparkles, X } from "lucide-react";
import { composeAutomationHook, isAutomationSocialDestination } from "@/lib/automations";
import { cn } from "@/lib/utils";
import { Field, Select } from "./automation-builder-fields";
import { DestinationSelector } from "./destination-selector";
import type { AutomationBuilderWorkspace } from "./use-automation-builder";

export function AutomationBuilderPhaseForm({
  workspace,
}: {
  workspace: AutomationBuilderWorkspace;
}) {
  const {
    record,
    phase,
    phaseIndex,
    setPhase,
    sourceFile,
    sourceFileLoading,
    collections,
    collectionsLoading,
    integrationStatuses,
    integrationsLoading,
    integrationsError,
    refreshIntegrations,
    setRecord,
    setValidationOpen,
    updateHook,
    updateContent,
    updateCta,
    toggleDay,
    selectDestination,
    PHASES,
    DAYS,
  } = workspace;

  return (
    <aside
      data-automation-form="true"
      className="relative border-b border-[var(--pf-border)] bg-card p-5 lg:border-b-0 lg:border-r"
    >
      <div className="flex gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--pf-active)] text-[13px] font-semibold text-muted-foreground">
          0{phaseIndex + 1}
        </span>
        <div>
          <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em]">
            {phase === "Hook" ? "Stop the scroll" : phase === "Content" ? "Deliver the value" : "Close with intent"}
          </h2>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            {phase === "Hook"
              ? "Choose how the first slide earns attention."
              : phase === "Content"
                ? "Shape the repeatable middle of every post."
                : "Decide what the final slide asks viewers to do."}
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {phase === "Hook" && (
          <>
            <Field label="Hook strategy">
              <Select
                value={record.hook.strategy}
                onChange={(value) => updateHook({ strategy: value })}
                options={["Curiosity gap", "Unexpected result", "Contrarian truth", "Specific transformation", "Concrete promise"]}
              />
            </Field>
            <Field label="Hook prompt">
              <textarea
                value={record.hook.prompt}
                onChange={(event) => updateHook({ prompt: event.target.value })}
                className="pf-input h-24"
              />
            </Field>
            <div>
              <button
                type="button"
                disabled={!record.hook.prompt.trim()}
                onClick={() =>
                  updateHook({
                    selected: composeAutomationHook(record.hook.strategy, record.hook.prompt),
                  })
                }
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 text-[13px] font-semibold text-[var(--pf-danger)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Sparkles className="size-3.5" /> Compose from prompt
              </button>
              <p className="mt-1.5 text-[11px] leading-3 text-muted-foreground">
                Composed locally from your prompt and strategy. No network request.
              </p>
            </div>
            <Field label="Selected hook">
              <input
                value={record.hook.selected}
                onChange={(event) => updateHook({ selected: event.target.value })}
                className="pf-input h-10"
              />
            </Field>
          </>
        )}
        {phase === "Content" && (
          <>
            <Field label="Story structure">
              <Select
                value={record.content.structure}
                onChange={(value) => updateContent({ structure: value })}
                options={[
                  "Problem → Shift → Result",
                  "3 quick lessons",
                  "Before → Change → After",
                  "Myth → Evidence → Reality",
                  "Product → Proof → Outcome",
                ]}
              />
            </Field>
            <Field label={`Slides per post · ${record.content.slideCount}`}>
              <input
                type="range"
                min="3"
                max="9"
                value={record.content.slideCount}
                onChange={(event) => updateContent({ slideCount: Number(event.target.value) })}
                className="w-full accent-[var(--pf-orange)]"
              />
            </Field>
            {record.content.sourceFileId && (
              <Field label="Attached generated asset">
                <div className="flex min-h-14 items-center gap-2 rounded-lg border border-border bg-white p-2">
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--pf-active)]">
                    {sourceFile?.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sourceFile.previewUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageIcon className="size-4 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[11px]">
                      {sourceFileLoading
                        ? "Checking source asset…"
                        : sourceFile?.filename ?? "Source asset unavailable"}
                    </b>
                    <small className="mt-0.5 block text-[11px] text-muted-foreground">
                      Persisted with this plan for the creative handoff
                    </small>
                  </span>
                  <button
                    type="button"
                    onClick={() => updateContent({ sourceFileId: null })}
                    className="grid size-7 shrink-0 place-items-center rounded-lg border border-border"
                    aria-label="Remove source asset"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </Field>
            )}
            <Field label="Visual collection">
              <select
                value={record.content.collectionId ?? ""}
                onChange={(event) => updateContent({ collectionId: event.target.value || null })}
                className="pf-input h-10"
                disabled={collectionsLoading}
              >
                <option value="">
                  {collectionsLoading ? "Loading collections…" : "No collection selected"}
                </option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name} · {collection.assetIds.length} assets
                  </option>
                ))}
              </select>
              <Link href="/collections" className="mt-1.5 inline-flex text-[11px] font-semibold text-[var(--pf-danger)]">
                Manage collections →
              </Link>
            </Field>
            <Field label="Writing guidance">
              <textarea
                value={record.content.guidance}
                onChange={(event) => updateContent({ guidance: event.target.value })}
                className="pf-input h-24"
              />
            </Field>
          </>
        )}
        {phase === "CTA" && (
          <>
            <Field label="CTA style">
              <Select
                value={record.cta.style}
                onChange={(value) => updateCta({ style: value })}
                options={["Save this post", "Follow for part two", "Comment a keyword", "Visit profile link", "No CTA"]}
              />
            </Field>
            <Field label="CTA prompt">
              <textarea
                value={record.cta.prompt}
                onChange={(event) => updateCta({ prompt: event.target.value })}
                className="pf-input h-24"
              />
            </Field>
            <DestinationSelector
              selector={{
                destination: record.destination,
                accountId: record.accountId ?? null,
                providers: integrationStatuses,
                loading: integrationsLoading,
                error: integrationsError,
                onSelect: selectDestination,
                onAccountSelect: (accountId, accountLabel) =>
                  setRecord((current) => ({ ...current, accountId, accountLabel })),
                onRetry: refreshIntegrations,
              }}
            />
            <label className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <span>
                <b className="block text-[12px]">Require approval</b>
                <small className="mt-1 block text-[12px] leading-3 text-muted-foreground">
                  {isAutomationSocialDestination(record.destination)
                    ? "Required for every social publishing destination"
                    : "Keep a review decision in the local workflow"}
                </small>
              </span>
              <input
                type="checkbox"
                checked={record.approvalRequired}
                disabled={isAutomationSocialDestination(record.destination)}
                onChange={(event) =>
                  setRecord((current) => ({
                    ...current,
                    approvalRequired: event.target.checked,
                  }))
                }
                aria-describedby="automation-approval-rule"
                className="size-4 shrink-0 accent-[var(--pf-orange)] disabled:cursor-not-allowed disabled:opacity-70"
              />
              <span id="automation-approval-rule" className="sr-only">
                Social publishing destinations always require approval.
              </span>
            </label>
          </>
        )}
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-muted-foreground">Schedule</legend>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((day) => (
              <button
                type="button"
                key={day}
                onClick={() => toggleDay(day)}
                aria-label={`Toggle ${day}`}
                aria-pressed={record.schedule.days.includes(day)}
                className={cn(
                  "h-8 rounded-lg border text-[12px]",
                  record.schedule.days.includes(day)
                    ? "border-[var(--pf-ink)] bg-foreground text-background"
                    : "border-border bg-white text-muted-foreground"
                )}
              >
                {day[0]}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              type="time"
              aria-label="Publish time"
              value={record.schedule.time}
              onChange={(event) =>
                setRecord((current) => ({
                  ...current,
                  schedule: { ...current.schedule, time: event.target.value },
                }))
              }
              className="pf-input h-9"
            />
            <select
              aria-label="Schedule timezone"
              value={record.schedule.timezone}
              onChange={(event) =>
                setRecord((current) => ({
                  ...current,
                  schedule: { ...current.schedule, timezone: event.target.value },
                }))
              }
              className="pf-input h-9"
            >
              <option>America/Toronto</option>
              <option>America/New_York</option>
              <option>America/Los_Angeles</option>
              <option>Europe/London</option>
            </select>
          </div>
        </fieldset>
      </div>
      <div className="mt-7 flex justify-between border-t border-border pt-4">
        <button
          onClick={() => setPhase(PHASES[Math.max(0, phaseIndex - 1)])}
          disabled={phaseIndex === 0}
          className="pf-button-secondary disabled:opacity-40"
        >
          <ArrowLeft className="size-3" /> Back
        </button>
        <button
          onClick={() =>
            phaseIndex === 2 ? setValidationOpen(true) : setPhase(PHASES[phaseIndex + 1])
          }
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-3 text-[13px] font-semibold text-white"
        >
          {phaseIndex === 2 ? "Review" : "Next"}
          <ArrowRight className="size-3" />
        </button>
      </div>
      <style jsx>{`.pf-input{width:100%;border:1px solid var(--pf-border);border-radius:8px;background:var(--pf-surface);color:var(--pf-ink);padding:0 10px;font-size:13px;outline:none;resize:none}.pf-input:focus{border-color:var(--pf-orange);box-shadow:0 0 0 3px color-mix(in oklch, var(--pf-orange) 12%, transparent)}`}</style>
    </aside>
  );
}
