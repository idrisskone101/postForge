import { Icon } from "@/components/workbench/icon";
import { IconButton } from "@/components/workbench/icon-button";
import type { PerformanceSyncWarning } from "./types";

/**
 * Everything that failed, in one notice: a request that just failed and each account whose last
 * sync the provider recorded as failed. Dismiss clears only the request errors, because a stored
 * sync failure is the account's real state and stays until a sync succeeds.
 */
export function PerformanceFailureNotice({
  errors,
  syncFailures,
  onDismiss,
}: {
  errors: string[];
  syncFailures: PerformanceSyncWarning[];
  onDismiss: () => void;
}) {
  if (errors.length === 0 && syncFailures.length === 0) return null;
  return (
    <div role="alert" className="wb-notice wb-fade-in min-h-12 shrink-0 pr-2.5 text-bad" data-tone="bad">
      <Icon name="alert" size={16} className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-1 [overflow-wrap:anywhere]">
        {errors.map((error) => {
          const { lead, rest } = splitLead(error);
          return (
            <span key={error}>
              <strong className="font-semibold">{lead}</strong>
              {rest ? ` ${rest}` : null}
            </span>
          );
        })}
        {syncFailures.map((failure) => (
          <span key={failure.key}>
            <strong className="font-semibold">{failure.lead}</strong> {failure.text}
          </span>
        ))}
      </span>
      {errors.length > 0 ? (
        <IconButton
          icon="x"
          label="Dismiss performance error"
          variant="ghost"
          size={28}
          className="text-bad"
          onClick={onDismiss}
        />
      ) : null}
    </div>
  );
}

/** The first sentence says what failed and is drawn as the lead. */
function splitLead(message: string) {
  const end = message.indexOf(". ");
  if (end < 0) return { lead: message, rest: "" };
  return { lead: message.slice(0, end + 1), rest: message.slice(end + 2) };
}
