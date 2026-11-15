"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Button, Icon, PageHeader } from "@/components/workbench";
import type { CharacterBuilderHeaderViewModel } from "./types";

export function CharacterBuilderHeader({
  view,
}: {
  view: CharacterBuilderHeaderViewModel;
}) {
  const {
    saving,
    rendering,
    missingEditRecord,
    previewSaveBlocked,
    randomizeAndRender,
    saveCharacter,
    saveAction,
  } = view;
  const wideName = useRef<HTMLInputElement>(null);
  const narrowName = useRef<HTMLInputElement>(null);
  useNameFocusAcrossBreakpoint(wideName, narrowName);

  return (
    <PageHeader
      className={HEADER_CLASS}
      back={{ href: "/characters", label: "Characters", labelled: true }}
      title={<NameField view={view} inputRef={wideName} />}
    >
      <Button
        variant="strong"
        size={40}
        onClick={randomizeAndRender}
        disabled={saving || rendering}
        aria-label="Randomize & render"
        aria-describedby="character-preview-generation-cost"
        title="Uses one paid image generation"
        className="max-sm:w-10 max-sm:px-0"
      >
        <Icon name="shuffle" />
        <span className="max-sm:hidden">Randomize & render</span>
      </Button>
      <Button
        variant="primary"
        size={40}
        className="px-5 max-sm:px-[18px]"
        onClick={saveCharacter}
        disabled={saving || rendering || missingEditRecord || previewSaveBlocked}
        title={saveAction.title}
      >
        {saveAction.label === "Save" ? "Save character" : saveAction.label}
      </Button>
      <h1 className="col-span-full row-start-2 min-w-0 sm:hidden">
        <NameField view={view} inputRef={narrowName} />
      </h1>
    </PageHeader>
  );
}

function NameField({
  view,
  inputRef,
}: {
  view: CharacterBuilderHeaderViewModel;
  inputRef: NameRef;
}) {
  return (
    <input
      ref={inputRef}
      value={view.name}
      onChange={(event) => view.onNameChange(event.target.value)}
      aria-label="Character name"
      aria-invalid={view.nameInvalid || undefined}
      placeholder="Add character name…"
      className="wb-input h-12 w-[340px] max-w-full text-2xl font-bold leading-[30px] tracking-[-0.02em] max-sm:w-full max-sm:text-[22px]"
    />
  );
}

const NARROW_HEADER = "(max-width: 639.98px)";

/**
 * The name field is drawn twice and each width shows one. Crossing 640px hides the one that is being
 * typed in, so focus and the caret move to its twin instead of dropping to the page.
 */
function useNameFocusAcrossBreakpoint(wide: NameRef, narrow: NameRef) {
  useEffect(() => watchNameFocus(wide, narrow), [wide, narrow]);
}

type NameRef = RefObject<HTMLInputElement | null>;

function watchNameFocus(wide: NameRef, narrow: NameRef) {
  const query = window.matchMedia(NARROW_HEADER);
  const onChange = () => {
    const hidden = query.matches ? wide.current : narrow.current;
    const shown = query.matches ? narrow.current : wide.current;
    if (!hidden || !shown || nameFocus.owner !== hidden) return;
    shown.focus({ preventScroll: true });
    shown.setSelectionRange(hidden.selectionStart, hidden.selectionEnd);
  };
  const onFocusIn = (event: FocusEvent) => {
    const target = event.target;
    nameFocus.owner = target === wide.current || target === narrow.current ? target : null;
  };
  query.addEventListener("change", onChange);
  document.addEventListener("focusin", onFocusIn);
  return () => {
    query.removeEventListener("change", onChange);
    document.removeEventListener("focusin", onFocusIn);
    nameFocus.owner = null;
  };
}

/** The name field that last took focus, if nothing else has taken it since. A hidden field gets no blur. */
const nameFocus: { owner: EventTarget | null } = { owner: null };

/*
 * Below 640px the header is Paper's two rows ("17 Character builder / 390"): the back pill with the
 * randomize icon button and the save action, then the name field across the full width. The name
 * field is rendered twice, once in the title and once after the actions, and each width shows one,
 * so the Tab order matches the drawn order at every width.
 */
const HEADER_CLASS = [
  "gap-y-3 pr-1 [&_.wb-page-header-lead]:gap-2 [&_.wb-page-title]:overflow-visible [&_.wb-page-title]:p-0.5",
  "max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto_auto] max-sm:items-center max-sm:gap-x-2 max-sm:gap-y-2.5",
  "[&_.wb-page-header-lead]:max-sm:contents [&_.wb-back-pill]:max-sm:justify-self-start",
  "[&_.wb-page-title]:max-sm:hidden [&_.wb-page-actions]:max-sm:contents",
].join(" ");
