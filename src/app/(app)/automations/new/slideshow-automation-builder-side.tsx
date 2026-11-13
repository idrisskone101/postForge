import { Chip } from "@/components/workbench/chip";
import { Field } from "@/components/workbench/field";
import { KeyValueList } from "@/components/workbench/key-value-list";
import { Panel } from "@/components/workbench/panel";
import { Toggle } from "@/components/workbench/toggle";
import type { SlideshowAutomationFieldsModel } from "./types";

export function SlideshowAutomationBuilderSide({
  fields,
}: {
  fields: SlideshowAutomationFieldsModel;
}) {
  const { days, time, active, existing, visualPolicy, expectedSlideCount, estimatedImageCost } =
    fields;
  const activeLabel = existing ? "Automation active" : "Start automation active";

  return (
    <div className="flex shrink-0 flex-col gap-3 xl:w-[372px]">
      <Panel pad="none" title="Schedule" className="gap-3 p-5 [&>.wb-panel-head]:min-h-0">
        <div className="flex flex-col gap-1.5">
          <div role="group" aria-label="Run days" className="flex gap-1.5">
            {WEEKDAYS.map((day) => (
              <Chip
                key={day}
                check={false}
                chosen={days.includes(day)}
                onClick={() => fields.onToggleDay(day)}
                className="min-w-0 flex-1 px-0 aria-[pressed=false]:text-fg-secondary"
              >
                {day}
              </Chip>
            ))}
          </div>
          {days.length ? null : (
            <p className="wb-field-error" role="alert">
              Pick at least one day.
            </p>
          )}
        </div>
        <Field label="Run time" htmlFor="slideshow-automation-time" className="w-[132px]">
          <input
            id="slideshow-automation-time"
            type="time"
            className="wb-input"
            data-mono="true"
            value={time}
            onChange={(event) => fields.onTimeChange(event.target.value)}
          />
        </Field>
        <div className="flex items-center gap-3 border-t border-hairline pt-3">
          <span className="flex-1 text-[14px] font-semibold leading-5 text-fg" aria-hidden="true">
            {existing ? "Active" : "Start active"}
          </span>
          <Toggle checked={active} onCheckedChange={fields.onActiveChange} label={activeLabel} />
        </div>
      </Panel>
      <Panel pad="none" title="Each run" className="gap-3 p-5 [&>.wb-panel-head]:min-h-0">
        <KeyValueList
          rows={[
            { label: "Slides", value: expectedSlideCount },
            {
              label: "Image cost",
              value: visualPolicy === "fresh-ai" ? `$${estimatedImageCost}` : "$0.00",
              mono: true,
            },
            { label: "Lands in", value: "Slideshow drafts" },
          ]}
        />
      </Panel>
    </div>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
