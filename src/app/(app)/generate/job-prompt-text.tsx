"use client";

import { useCallback, useState } from "react";
import { structuredPromptLead } from "@/lib/ai/prompt-presentation";
import { cn } from "@/lib/utils";

/**
 * The real prompt, led by its task sentence and clamped to six lines. "Show full prompt" opens the
 * whole record in place, so the inspector's own scroll carries it and nothing scrolls inside it.
 */
export function JobPromptText({ prompt }: { prompt: string }) {
  const [showFull, setShowFull] = useState(false);
  const [clamped, setClamped] = useState(false);
  const lead = structuredPromptLead(prompt);
  const structured = lead !== null;
  const measure = useCallback((node: HTMLParagraphElement | null) => {
    if (node) setClamped(node.scrollHeight > node.clientHeight + 1);
  }, []);

  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      {showFull && structured ? (
        <pre
          id="job-prompt-full"
          className="wb-fade-in m-0 w-full whitespace-pre-wrap rounded-lg bg-raised p-3 font-mono text-[12px] leading-[18px] text-fg-secondary [overflow-wrap:anywhere]"
        >
          {prompt}
        </pre>
      ) : (
        <p id="job-prompt-full" ref={measure} className={cn(TEXT_CLASS, !showFull && "line-clamp-6")}>
          {structured ? lead : prompt}
        </p>
      )}
      {structured || clamped || showFull ? (
        <button
          type="button"
          aria-expanded={showFull}
          aria-controls="job-prompt-full"
          onClick={() => setShowFull((current) => !current)}
          className="-mx-1.5 rounded-md px-1.5 text-[13px] font-semibold leading-[22px] text-fg-secondary transition-[background-color] duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised focus-visible:outline-2 focus-visible:outline-ember"
        >
          {showFull ? "Show less" : "Show full prompt"}
        </button>
      ) : null}
    </div>
  );
}

const TEXT_CLASS = "m-0 text-[14px] leading-5 text-fg [overflow-wrap:anywhere]";
