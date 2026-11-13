import Link from "next/link";
import { Button, buttonClass } from "@/components/workbench/button";
import { Field } from "@/components/workbench/field";
import { Icon } from "@/components/workbench/icon";
import { Panel } from "@/components/workbench/panel";
import type { SlideshowAutomationFieldsModel } from "./types";

export function SlideshowAutomationBuilderFields({
  fields,
  loadError,
}: {
  fields: SlideshowAutomationFieldsModel;
  loadError: string | null;
}) {
  const { name, projectId, projects, collections, imageCollectionId, hooks, saveError } = fields;
  const nameMissing = !name.trim();

  return (
    <Panel pad="roomy" className="min-w-0 flex-1 justify-between gap-6">
      <div className="flex flex-col gap-6">
        {loadError ? (
          <p role="alert" className="wb-notice" data-tone="bad">
            <strong>Could not load</strong>
            {loadError}
          </p>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-2.5">
          <Field
            label="Name"
            htmlFor="slideshow-automation-name"
            error={nameMissing ? "Name the automation to save it." : undefined}
            className="flex-1"
          >
            <input
              id="slideshow-automation-name"
              className="wb-input"
              value={name}
              aria-invalid={nameMissing || undefined}
              onChange={(event) => fields.onNameChange(event.target.value)}
            />
          </Field>
          <Field label="Starting slideshow" htmlFor="slideshow-automation-project" className="flex-1">
            <select
              id="slideshow-automation-project"
              className="wb-input"
              value={projectId}
              onChange={(event) => fields.onProjectChange(event.target.value)}
            >
              <option value="">Generate from hook pool</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <VisualPolicy fields={fields} />

        {!projectId && fields.visualPolicy === "reuse" ? (
          <Field label="Image collection" htmlFor="slideshow-automation-collection">
            <select
              id="slideshow-automation-collection"
              className="wb-input"
              value={imageCollectionId}
              onChange={(event) => fields.onImageCollectionChange(event.target.value)}
            >
              <option value="">No collection, use text backgrounds</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id} disabled={!collection.imageCount}>
                  {collection.name}, {collection.imageCount} image
                  {collection.imageCount === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <Field label="Hook pool" htmlFor="slideshow-automation-hooks">
          <textarea
            id="slideshow-automation-hooks"
            className="wb-input resize-none"
            rows={4}
            value={hooks}
            aria-describedby="slideshow-automation-hooks-note"
            onChange={(event) => fields.onHooksChange(event.target.value)}
          />
          <p id="slideshow-automation-hooks-note" className="wb-meta">
            One hook per line. Runs avoid previously used hooks.
          </p>
        </Field>
      </div>

      <div className="flex flex-col gap-4">
        {saveError ? (
          <p role="alert" className="wb-notice" data-tone="bad">
            <strong>Save failed</strong>
            {saveError}
          </p>
        ) : null}
        <div className="wb-panel-foot">
          <Link href="/automations" className={buttonClass("quiet", 40)}>
            Cancel
          </Link>
          <Button
            variant="primary"
            size={40}
            onClick={() => void fields.onSubmit()}
            disabled={nameMissing || !fields.days.length || fields.saving}
          >
            {fields.saveLabel}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

const VISUAL_POLICIES = [
  {
    value: "reuse",
    name: "Reuse starting visuals",
    detail: "Copies the starting slideshow or a collection, no image charge",
  },
  {
    value: "fresh-ai",
    name: "Generate fresh AI images",
    detail: "One Nano Banana 2 image per slide at $0.08",
  },
] as const;

function VisualPolicy({ fields }: { fields: SlideshowAutomationFieldsModel }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="wb-panel-title pb-2.5">Visuals for each run</legend>
      {VISUAL_POLICIES.map((policy) => {
        const chosen = fields.visualPolicy === policy.value;
        return (
          <button
            key={policy.value}
            type="button"
            className="wb-option"
            aria-pressed={chosen}
            onClick={() => fields.onVisualPolicyChange(policy.value)}
          >
            <span className="wb-radio">
              <Icon name="check-chosen" size={14} strokeWidth={2.5} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3.5">
              <span className={chosen ? "font-bold sm:w-[220px] sm:shrink-0" : "font-semibold sm:w-[220px] sm:shrink-0"}>
                {policy.name}
              </span>
              <span className="min-w-0 flex-1 text-fg-secondary">{policy.detail}</span>
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
