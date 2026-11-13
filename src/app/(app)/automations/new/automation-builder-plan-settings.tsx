"use client";

import Link from "next/link";
import { Chip, Field, Toggle } from "@/components/workbench";
import { cn } from "@/lib/utils";
import { isAutomationSocialDestination } from "@/lib/automations";
import { TIMEZONES } from "./automation-builder-fields";
import { DestinationSelector } from "./destination-selector";
import { TimeSelect } from "./time-select";
import type { AutomationBuilderWorkspace } from "./use-automation-builder";

export function AutomationBuilderPlanSettings({
  workspace,
}: {
  workspace: AutomationBuilderWorkspace;
}) {
  const {
    record,
    setRecord,
    collections,
    collectionsLoading,
    integrationStatuses,
    integrationsLoading,
    integrationsError,
    refreshIntegrations,
    updateContent,
    toggleDay,
    selectDestination,
    DAYS,
  } = workspace;
  const social = isAutomationSocialDestination(record.destination);
  const timezones = TIMEZONES.includes(
    record.schedule.timezone as (typeof TIMEZONES)[number],
  )
    ? TIMEZONES
    : [record.schedule.timezone, ...TIMEZONES];

  return (
    <section
      aria-labelledby="builder-plan-settings"
      className="flex shrink-0 flex-col gap-3 rounded-xl bg-panel p-5 shadow-panel"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="builder-plan-settings" className="wb-panel-title">
          Plan settings
        </h2>
        <Link
          href="/collections"
          className="text-[12px] font-semibold leading-4 text-fg-secondary underline underline-offset-2"
        >
          Manage collections
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-2.5 gap-y-3">
        <Field
          label="Visual collection"
          htmlFor="builder-collection"
          className="min-w-0"
        >
          <select
            id="builder-collection"
            value={record.content.collectionId ?? ""}
            onChange={(event) =>
              updateContent({ collectionId: event.target.value || null })
            }
            className="wb-input"
            disabled={collectionsLoading}
          >
            <option value="">
              {collectionsLoading
                ? "Loading collections"
                : "None selected"}
            </option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name} ({collection.assetIds.length} assets)
              </option>
            ))}
          </select>
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
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="wb-label" id="builder-schedule-label">
          Schedule
        </span>
        <div
          role="group"
          aria-labelledby="builder-schedule-label"
          className="flex gap-1.5"
        >
          {DAYS.map((day) => (
            <Chip
              key={day}
              check={false}
              chosen={record.schedule.days.includes(day)}
              onClick={() => toggleDay(day)}
              aria-label={`Toggle ${day}`}
              className={cn(
                "min-w-0 flex-1 justify-center px-0",
                !record.schedule.days.includes(day) && "text-fg-secondary"
              )}
            >
              {day}
            </Chip>
          ))}
        </div>
      </div>
      <div className="flex gap-2.5">
        <Field
          label="Publish time"
          htmlFor="builder-time"
          className="w-[128px] shrink-0"
        >
          <TimeSelect
            id="builder-time"
            value={record.schedule.time}
            onChange={(time) =>
              setRecord((current) => ({
                ...current,
                schedule: { ...current.schedule, time },
              }))
            }
          />
        </Field>
        <Field
          label="Timezone"
          htmlFor="builder-timezone"
          className="min-w-0 flex-1"
        >
          <select
            id="builder-timezone"
            aria-label="Schedule timezone"
            value={record.schedule.timezone}
            onChange={(event) =>
              setRecord((current) => ({
                ...current,
                schedule: { ...current.schedule, timezone: event.target.value },
              }))
            }
            className="wb-input"
          >
            {timezones.map((timezone) => (
              <option key={timezone}>{timezone}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex items-center gap-3 border-t border-hairline pt-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span aria-hidden="true" className="text-[14px] font-semibold leading-5 text-fg">
            Require approval
          </span>
          {social ? (
            <span
              id="automation-approval-rule"
              className="text-[12px] leading-4 text-fg-secondary"
            >
              Always on for social destinations
            </span>
          ) : null}
        </div>
        <Toggle
          checked={record.approvalRequired}
          disabled={social}
          label="Require approval"
          aria-describedby={social ? "automation-approval-rule" : undefined}
          onCheckedChange={(checked) =>
            setRecord((current) => ({ ...current, approvalRequired: checked }))
          }
        />
      </div>
    </section>
  );
}
