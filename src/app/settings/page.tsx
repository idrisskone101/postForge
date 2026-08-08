import { Suspense } from "react";
import { SettingsPageClient } from "./settings-page-client";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-[600px] animate-pulse bg-[var(--pf-canvas)]" />}>
      <SettingsPageClient />
    </Suspense>
  );
}
