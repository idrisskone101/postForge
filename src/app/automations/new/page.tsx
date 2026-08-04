import { Suspense } from "react";
import { AutomationBuilderClient } from "./automation-builder-client";

export default function AutomationBuilderPage() {
  return (
    <Suspense fallback={<div className="pf-content-viewport animate-pulse bg-[#F3F4EF]" />}>
      <AutomationBuilderClient />
    </Suspense>
  );
}
