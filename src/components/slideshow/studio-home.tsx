"use client";

import { CountBadge } from "@/components/workbench/count-badge";
import { PageHeader } from "@/components/workbench/page-header";

import { CreateView, DraftsView } from "./slideshow-studio-islands";
import { useSlideshowHome } from "./slideshow-home-provider";
import type { SlideshowSection } from "./types";

export function StudioHome() {
  const { section, onSectionChange, draftsCount } = useSlideshowHome();
  return (
    <>
      <PageHeader title="Slideshow">
        <div role="tablist" aria-label="Slideshow studio" className="wb-segmented h-10 gap-0.5 p-1">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={section === id}
              onClick={() => onSectionChange(id)}
              className="wb-segment h-8 gap-2 px-[18px] text-[14px] leading-[18px] has-[.wb-count]:pr-3.5"
            >
              {label}
              {id === "drafts" && draftsCount ? (
                <CountBadge count={draftsCount} label={`${draftsCount} drafts`} />
              ) : null}
            </button>
          ))}
        </div>
      </PageHeader>
      {section === "create" ? <CreateView /> : <DraftsView />}
    </>
  );
}

const SECTIONS: Array<{ id: SlideshowSection; label: string }> = [
  { id: "create", label: "Create" },
  { id: "drafts", label: "Drafts" },
];
