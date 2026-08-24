import { Suspense } from "react";
import { SettingsPageClient } from "./settings-page-client";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="px-5 py-8"><h1 className="text-[28px] font-semibold">Settings</h1></div>}>
      <SettingsPageClient />
    </Suspense>
  );
}
