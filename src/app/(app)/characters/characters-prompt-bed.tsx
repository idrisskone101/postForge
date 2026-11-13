"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Four lines of 13px text in the inspector bed hold about this many characters. */
const CLAMPED_LENGTH = 180;

export function CharacterPromptBed({ prompt }: { prompt: string }) {
  const [expanded, setExpanded] = useState(false);
  const expandable = prompt.length > CLAMPED_LENGTH;

  return (
    <div
      data-character-prompt-bed
      className={cn(
        "flex min-w-0 flex-col items-start gap-1.5 rounded-lg bg-raised px-3.5 py-3",
        expanded ? "min-h-[96px] flex-[0_1_auto]" : "shrink-0"
      )}
    >
      <p
        id="character-prompt-text"
        className={cn(
          "min-h-0 text-[13px] leading-[19px] text-fg-secondary [overflow-wrap:anywhere]",
          expanded ? "overflow-y-auto" : "line-clamp-4"
        )}
      >
        {prompt}
      </p>
      {expandable ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="character-prompt-text"
          onClick={() => setExpanded((current) => !current)}
          className="shrink-0 rounded-sm text-[13px] font-semibold leading-[19px] text-fg underline decoration-fg-muted underline-offset-2 outline-none hover:decoration-fg focus-visible:shadow-[0_0_0_2px_var(--pf-ember)]"
        >
          {expanded ? "Show less" : "Show all"}
        </button>
      ) : null}
    </div>
  );
}
