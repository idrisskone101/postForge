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
      className="gap-y-3 [&_.wb-page-header-lead]:max-sm:flex-wrap [&_.wb-page-title]:overflow-visible [&_.wb-page-title]:p-0.5"
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
        aria-describedby="character-preview-generation-cost"
        title="Uses one paid image generation"
      >
        <Icon name="shuffle" />
        {rendering ? "Rendering…" : "Randomize & render"}
      </Button>
      <Button
        variant="primary"
        size={40}
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
