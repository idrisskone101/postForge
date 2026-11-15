"use client";

import { useLayoutEffect, useRef } from "react";
import { Button } from "@/components/workbench";
import { cn } from "@/lib/utils";

export type HubLoadFailure = { tone: "bad" | "warn"; lead: string; detail: string };

/**
 * Every failed load in one notice with the one Retry, which reloads all three. The notice stays
 * mounted while the reload runs, so focus stays on Retry; when the last failure clears and the
 * notice leaves with focus inside it, focus goes to the page's main region instead of the body.
 */
export function HubLoadNotice({
  failures,
  loading,
  onRetry,
}: {
  failures: HubLoadFailure[];
  loading: boolean;
  onRetry: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const notice = ref.current;
    return () => {
      if (notice?.contains(document.activeElement)) {
        document.getElementById("workspace-shell")?.focus({ preventScroll: true });
      }
    };
  }, []);
  const bad = failures.some((failure) => failure.tone === "bad");
  return (
    <div
      ref={ref}
      role={bad ? "alert" : "status"}
      className="wb-notice shrink-0"
      data-tone={bad ? "bad" : "warn"}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1 break-words [overflow-wrap:anywhere]">
        {failures.map((failure) => (
          <span key={failure.lead}>
            <strong className={cn("font-semibold", failure.tone === "bad" ? "text-bad" : "text-warn")}>
              {failure.lead}
            </strong>{" "}
            {failure.detail}
          </span>
        ))}
      </span>
      <Button size={32} aria-busy={loading || undefined} onClick={loading ? undefined : onRetry}>
        Retry
      </Button>
    </div>
  );
}

/** What the last load of the hub could not fetch. A list that failed is an error; unknown connection status is a warning. */
export function hubLoadFailures(errors: {
  records: string | null;
  schedules: string | null;
  connections: string | null;
}): HubLoadFailure[] {
  const failures: HubLoadFailure[] = [];
  if (errors.records) failures.push({ tone: "bad", lead: "Automations did not load.", detail: errors.records });
  if (errors.schedules) failures.push({ tone: "bad", lead: "Schedules did not load.", detail: errors.schedules });
  if (errors.connections) {
    failures.push({ tone: "warn", lead: "Connection status unavailable.", detail: errors.connections });
  }
  return failures;
}
