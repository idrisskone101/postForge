"use client";

import { useSearchParams } from "next/navigation";
import { AutomationBuilderSkeleton } from "./automation-builder-skeleton";

/**
 * The builder before its record is ready: the skeleton under the page's one heading. The builder's
 * own header carries the heading once it mounts, so every stage of the load has exactly one.
 */
export function AutomationBuilderLoading() {
  const editing = useSearchParams().has("id");
  return (
    <>
      <h1 className="sr-only">{editing ? "Edit automation" : "New automation"}</h1>
      <AutomationBuilderSkeleton />
    </>
  );
}
