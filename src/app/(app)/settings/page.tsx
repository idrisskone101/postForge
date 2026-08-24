import { Suspense } from "react";
import { SettingsPageClient } from "./settings-page-client";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div data-settings-pending="true" />}>
      <SettingsPageClient />
    </Suspense>
  );
}
