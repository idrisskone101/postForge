"use client";

import dynamic from "next/dynamic";

export const AutomationBuilderPhaseFormLazy = dynamic(
  () =>
    import("./automation-builder-phase-form").then((mod) => ({
      default: mod.AutomationBuilderPhaseForm,
    })),
  { ssr: false },
);
