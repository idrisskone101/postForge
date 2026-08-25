"use client";

import dynamic from "next/dynamic";

export const AutomationPlaybookOverlayLazy = dynamic(
  () =>
    import("./automation-playbook-overlay").then((mod) => ({
      default: mod.AutomationPlaybookOverlay,
    })),
  { ssr: true },
);
