"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";
import { Panel } from "@/components/workbench/panel";

export function HomeLoadFailed() {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  return (
    <Panel className="max-[767px]:px-4">
      <EmptyState icon="alert" tone="error" title="Home could not load" className="min-h-[280px]">
        <Button variant="strong" disabled={retrying} onClick={() => startRetry(() => router.refresh())}>
          {retrying ? "Trying again" : "Try again"}
        </Button>
      </EmptyState>
    </Panel>
  );
}
