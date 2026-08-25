"use client";

import dynamic from "next/dynamic";

export const AutomationBuilderSessionLazy = dynamic(
  () =>
    import("./automation-builder-session").then((mod) => ({
      default: mod.AutomationBuilderSession,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        data-automation-builder="true"
        className="pf-content-viewport flex flex-col bg-[var(--pf-canvas)]"
        aria-busy="true"
      >
        <header className="flex h-[82px] shrink-0 items-center border-b border-border bg-[var(--pf-active)] px-4 sm:px-6" />
        <div data-automation-phases="true" className="h-[59px] shrink-0 border-b border-[var(--pf-border)] bg-white" />
        <section data-automation-workspace="true" className="grid min-h-0 flex-1 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside data-automation-form="true" />
          <div data-automation-preview="true" />
        </section>
      </div>
    ),
  },
);
