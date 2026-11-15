"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AvatarPicker } from "@/components/avatar-picker";
import { Icon } from "@/components/workbench";
import { CloneIdentityStatusPanel } from "@/components/clone/identity-status";
import { CLONE_STEP_FOCUS_CLASS, useCloneStepEntry } from "@/components/clone/use-clone-step-entry";
import type { CloneDraft } from "@/components/clone/view-models";

export function CloneIdentityStep({
  draft,
  hidden,
}: {
  draft: CloneDraft;
  hidden: boolean;
}) {
  const stepEntry = useCloneStepEntry("identity", hidden);
  const [query, setQuery] = useState("");
  // The field filters the character list, so it leaves while Generate, Gallery or Import is open.
  const [listShowing, setListShowing] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
  // The Clear search button leaves with the empty state, so focus goes back to the field.
  const clearSearch = () => {
    setQuery("");
    searchRef.current?.focus();
  };
  return (
    <section
      {...stepEntry}
      data-clone-identity-section="true"
      className={cn("flex min-w-0 flex-col gap-2.5", CLONE_STEP_FOCUS_CLASS, hidden && "hidden")}
    >
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="wb-panel-title">
          Choose who appears
        </h2>
        {listShowing && (
        <label className="wb-input-wrap w-[220px] max-sm:w-full" data-size="36">
          <Icon name="search" size={15} className="shrink-0 text-fg-muted" />
          <span className="sr-only">Search characters</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search characters"
            className="[&::-webkit-search-cancel-button]:hidden"
          />
        </label>
        )}
      </div>
      <AvatarPicker
        selectedId={draft.avatarId}
        onSelect={draft.onSelectAvatar}
        search={{ query, onClear: clearSearch }}
        onModeChange={(mode) => setListShowing(mode === "grid")}
      />
      {/* The row is always there, so choosing an identity does not move the footer under it. On a phone
          it holds the button beside three lines of reason. */}
      <div data-clone-identity-status="true" className="flex min-h-8 min-w-0 items-center max-sm:min-h-12">
        <CloneIdentityStatusPanel identity={draft} />
      </div>
    </section>
  );
}
