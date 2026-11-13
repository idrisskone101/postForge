"use client";

import { useEffect } from "react";
import { Button, Icon } from "@/components/workbench";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] min-w-0 items-center justify-center p-4">
      <section
        role="alert"
        className="wb-panel w-full max-w-[460px] items-start gap-4 wb-fade-in"
        data-pad="roomy"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bad-tint text-bad">
          <Icon name="alert" size={18} strokeWidth={2} />
        </span>
        <div className="flex w-full min-w-0 flex-col gap-2">
          <h2 className="wb-panel-title">Something went wrong</h2>
          <p className="min-w-0 break-words text-[13px] leading-5 text-fg-secondary [overflow-wrap:anywhere]">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
          {error.digest && (
            <p className="wb-mono min-w-0 break-words text-fg-muted [overflow-wrap:anywhere]">
              Error ID {error.digest}
            </p>
          )}
        </div>
        <Button variant="strong" onClick={reset}>
          Try again
        </Button>
      </section>
    </div>
  );
}
