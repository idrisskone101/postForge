import { Suspense } from "react";
import { AutomationBuilderClient } from "./automation-builder-client";
import { SlideshowAutomationBuilder } from "./slideshow-automation-builder";

export default async function AutomationBuilderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const workflow = typeof params.workflow === "string" ? params.workflow : null;

  return (
    <Suspense fallback={<div className="pf-content-viewport animate-pulse bg-[#F3F4EF]" />}>
      {workflow === "slideshow" ? (
        <SlideshowAutomationBuilder />
      ) : (
        <AutomationBuilderClient />
      )}
    </Suspense>
  );
}
