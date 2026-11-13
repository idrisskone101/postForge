"use client";

import { useState } from "react";
import { structuredPromptLead } from "@/lib/ai/prompt-presentation";

/** The real prompt. A structured prompt leads with its sentence and keeps the full JSON one click away. */
export function JobPromptText({ prompt }: { prompt: string }) {
  const [showFull, setShowFull] = useState(false);
  const lead = structuredPromptLead(prompt);

  if (!lead) return <p className={TEXT_CLASS}>{prompt}</p>;

  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <p className={TEXT_CLASS}>{lead}</p>
      <button
        type="button"
        aria-expanded={showFull}
        aria-controls="job-prompt-full"
        onClick={() => setShowFull((current) => !current)}
        className="wb-btn h-7 px-3 text-[12px] leading-4"
      >
        {showFull ? "Hide full prompt" : "Show full prompt"}
      </button>
      {showFull && (
        <pre
          id="job-prompt-full"
          className="wb-fade-in m-0 w-full whitespace-pre-wrap rounded-lg bg-raised p-3 font-mono text-[12px] leading-[18px] text-fg-secondary [overflow-wrap:anywhere]"
        >
          {prompt}
        </pre>
      )}
    </div>
  );
}

const TEXT_CLASS = "m-0 text-[14px] leading-5 text-fg [overflow-wrap:anywhere]";
