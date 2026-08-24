"use client";

import dynamic from "next/dynamic";

export const SettingsPageLazy = dynamic(
  () =>
    import("./settings-page-client").then((mod) => ({
      default: mod.SettingsPageClient,
    })),
  { ssr: false, loading: () => <div data-settings-pending="true" /> },
);
