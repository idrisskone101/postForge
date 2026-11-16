"use client";

import Link from "next/link";
import { Button, buttonClass } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";
import { Panel } from "@/components/workbench/panel";

export default function PerformanceError({ reset }: { reset: () => void }) {
  return (
    <Panel className="min-w-0">
      <EmptyState
        icon="alert"
        tone="error"
        title="Performance failed to load"
        detail="Connected accounts and imported CSV data are unchanged. Try again."
        className="min-h-[420px]"
      >
        <Button variant="strong" onClick={reset}>
          Try again
        </Button>
        <Link href="/" className={buttonClass("quiet")}>
          Back to Home
        </Link>
      </EmptyState>
    </Panel>
  );
}
