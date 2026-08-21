"use client";

import { cn } from "@/lib/utils";
import type { AutomationPublication } from "@/lib/automations";

function publicationVisibilityLabel(publication: AutomationPublication) {
  if (publication.providerVisibility) {
    return publication.providerVisibility.replaceAll("_", " ").toLowerCase();
  }
  return publication.visibility
    ? `${publication.visibility} requested · provider privacy readback unavailable`
    : "provider privacy pending";
}

export function PublicationStatus({
  publication,
}: {
  publication: AutomationPublication;
}) {
  const label =
    publication.status === "pending"
      ? "Preparing secure handoff"
      : publication.status === "submitted"
        ? "Provider processing"
        : publication.status === "published"
          ? "Provider published"
          : "Publish failed";
  return (
    <div className="mt-1 min-w-0 text-[11px] leading-3 text-muted-foreground">
      <b
        className={cn(
          "block min-w-0 break-words [overflow-wrap:anywhere]",
          publication.status === "failed"
            ? "text-[var(--pf-danger)]"
            : publication.status === "published"
              ? "text-[var(--pf-success)]"
              : "text-[var(--pf-lamp-amber)]"
        )}
      >
        {label}
      </b>
      {publication.providerStatus && (
        <span className="block min-w-0 break-words [overflow-wrap:anywhere]">
          {publication.providerStatus.replaceAll("_", " ").toLowerCase()} ·{" "}
          {publicationVisibilityLabel(publication)}
        </span>
      )}
      {publication.error && (
        <span
          role="alert"
          className="block min-w-0 break-words text-[var(--pf-danger)] [overflow-wrap:anywhere]"
        >
          {publication.error}
        </span>
      )}
    </div>
  );
}
