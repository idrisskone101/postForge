"use client";

import { Button, Icon, PageHeader } from "@/components/workbench";
import type { CharacterBuilderHeaderViewModel } from "./types";

export function CharacterBuilderHeader({
  view,
}: {
  view: CharacterBuilderHeaderViewModel;
}) {
  const {
    name,
    nameInvalid,
    saving,
    rendering,
    missingEditRecord,
    previewSaveBlocked,
    onNameChange,
    randomizeAndRender,
    saveCharacter,
    saveAction,
  } = view;

  return (
    <PageHeader
      className={HEADER_CLASS}
      back={{ href: "/characters", label: "Characters", labelled: true }}
      title={
        <input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          aria-label="Character name"
          aria-invalid={nameInvalid || undefined}
          placeholder="Add character name…"
          className="wb-input h-12 w-[340px] max-w-full text-2xl font-bold leading-[30px] tracking-[-0.02em] max-sm:w-full max-sm:text-[22px]"
        />
      }
    >
      <Button
        variant="strong"
        size={40}
        onClick={randomizeAndRender}
        disabled={saving || rendering}
        aria-label={rendering ? "Rendering…" : "Randomize & render"}
        aria-describedby="character-preview-generation-cost"
        title="Uses one paid image generation"
        className="max-sm:w-10 max-sm:px-0"
      >
        <Icon name="shuffle" />
        <span className="max-sm:hidden">{rendering ? "Rendering…" : "Randomize & render"}</span>
      </Button>
      <Button
        variant="primary"
        size={40}
        className="px-5 max-sm:px-[18px]"
        onClick={saveCharacter}
        disabled={saving || rendering || missingEditRecord || previewSaveBlocked}
        aria-label="Save character"
        title={saveAction.title}
      >
        {saveAction.label === "Save" ? "Save character" : saveAction.label}
      </Button>
    </PageHeader>
  );
}

/*
 * Below 640px the header is Paper's two rows ("17 Character builder / 390"): the back pill with the
 * randomize icon button and the save action, then the name field across the full width.
 */
const HEADER_CLASS = [
  "gap-y-3 pr-1 [&_.wb-page-header-lead]:gap-2 [&_.wb-page-title]:overflow-visible [&_.wb-page-title]:p-0.5",
  "max-sm:grid max-sm:grid-cols-[auto_minmax(0,1fr)] max-sm:items-center max-sm:gap-x-2 max-sm:gap-y-2.5",
  "[&_.wb-page-header-lead]:max-sm:contents [&_.wb-back-pill]:max-sm:justify-self-start",
  "[&_.wb-page-title]:max-sm:col-span-2 [&_.wb-page-title]:max-sm:row-start-2 [&_.wb-page-title]:max-sm:p-0",
  "[&_.wb-page-actions]:max-sm:col-start-2 [&_.wb-page-actions]:max-sm:row-start-1 [&_.wb-page-actions]:max-sm:justify-end",
].join(" ");
