"use client";

import { cn } from "@/lib/utils";
import type { AutomationPublication } from "@/lib/automations";
import {
  publicationStatusHeadline,
  publicationStatusHeadlineClass,
  publicationStatusPillClass,
} from "./hub-visual";

export function PublicationStatus({
  publication,
}: {
  publication: AutomationPublication;
}) {
  const label = publicationStatusHeadline(publication);
  return (
    <div className="mt-1 min-w-0 text-[11px] leading-3 text-[var(--pf-muted)]">
      <span
        className={cn(
          "inline-flex max-w-full items-center gap-1 px-2 py-0.5 text-[11px] font-bold [overflow-wrap:anywhere]",
          publicationStatusPillClass(publication)
        )}
      >
        <b className={cn("min-w-0 break-words", publicationStatusHeadlineClass(publication))}>
          {label}
        </b>
      </span>
      {publication.providerStatus && (
        <span className="mt-1 block min-w-0 break-words [overflow-wrap:anywhere]">
          {publication.providerStatus.replaceAll("_", " ").toLowerCase()} ·{" "}
          {publicationVisibilityLabel(publication)}
        </span>
      )}
      {publication.error && (
        <span
          role="alert"
          className="mt-1 block min-w-0 break-words text-[var(--pf-danger)] [overflow-wrap:anywhere]"
        >
          {publication.error}
        </span>
      )}
    </div>
  );
}

function publicationVisibilityLabel(publication: AutomationPublication) {
  if (publication.providerVisibility) {
    return publication.providerVisibility.replaceAll("_", " ").toLowerCase();
  }
  return publication.visibility
    ? `${publication.visibility} requested · provider privacy readback unavailable`
    : "provider privacy pending";
}
