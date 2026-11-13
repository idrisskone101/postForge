"use client";

import { CountBadge } from "@/components/workbench/count-badge";
import { PageHeader } from "@/components/workbench/page-header";

import { CreateView, DraftsView } from "./slideshow-studio-islands";
import { useSlideshowHome } from "./slideshow-home-provider";
import type { SlideshowSection } from "./types";

export function StudioHome() {
  const { section, onSectionChange, draftsCount, draftPages } = useSlideshowHome();
  const reserveCount = draftPages.total === null || draftsCount > 0;
  return (
    <>
      <PageHeader title="Slideshow" stackBelow={480}>
        <div role="tablist" aria-label="Slideshow studio" className="wb-segmented h-10 gap-0.5 p-1 max-[479.98px]:flex max-[479.98px]:w-full">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={section === id}
              onClick={() => onSectionChange(id)}
              className="wb-segment h-8 gap-2 px-[18px] text-[14px] leading-[18px] has-[[data-count-slot]]:pr-3.5 max-[479.98px]:flex-1"
            >
              {label}
              {id === "drafts" && reserveCount ? (
                <span data-count-slot className="inline-flex min-w-[27px] justify-center">
                  <CountBadge count={draftsCount} label={`${draftsCount} drafts`} />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </PageHeader>
      <div key={section} className="wb-fade-in flex min-w-0 flex-col gap-3">
        {section === "create" ? <CreateView /> : <DraftsView />}
      </div>
    </>
  );
}

const SECTIONS: Array<{ id: SlideshowSection; label: string }> = [
  { id: "create", label: "Create" },
  { id: "drafts", label: "Drafts" },
];
