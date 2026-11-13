"use client";

import Link from "next/link";
import { Button, buttonClass } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";
import { Panel } from "@/components/workbench/panel";

export function SpendLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Panel className="min-w-0">
      <EmptyState
        icon="alert"
        tone="error"
        title="Spend failed to load"
        detail="Cost logs are unchanged. Check the database connection and try again."
        className="min-h-[420px]"
      >
        <Button variant="strong" onClick={onRetry}>
          Try again
        </Button>
        <Link href="/" className={buttonClass("quiet")}>
          Back to Home
        </Link>
      </EmptyState>
    </Panel>
  );
}
