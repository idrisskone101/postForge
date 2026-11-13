"use client";

import { StatusChip } from "@/components/workbench";
import type { AutomationPublication } from "@/lib/automations";
import { publicationStatusHeadline, publicationStatusTone } from "./hub-visual";

export function PublicationStatus({
  publication,
}: {
  publication: AutomationPublication;
}) {
  return (
    <div className="mt-1.5 flex min-w-0 flex-col items-start gap-1 text-[12px] leading-4 text-fg-muted">
      <StatusChip tone={publicationStatusTone(publication)}>
        {publicationStatusHeadline(publication)}
      </StatusChip>
      {publication.providerStatus && (
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">
          {publication.providerStatus.replaceAll("_", " ").toLowerCase()},{" "}
          {publicationVisibilityLabel(publication)}
        </span>
      )}
      {publication.error && (
        <span role="alert" className="min-w-0 break-words text-bad [overflow-wrap:anywhere]">
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
    ? `${publication.visibility} requested, provider privacy readback unavailable`
    : "provider privacy pending";
}
