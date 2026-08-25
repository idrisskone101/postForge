"use client";

import { CreateView, DraftsView } from "./slideshow-studio-islands";
import { StudioSectionNav } from "./studio-section-nav";
import { useSlideshowHome } from "./slideshow-home-provider";

export function StudioHome() {
  const home = useSlideshowHome();
  return (
    <>
      <StudioSectionNav />
      <div
        data-slideshow-home-body="true"
        className="mx-auto w-full max-w-[1240px] px-4 pb-16 sm:px-6 lg:px-8"
      >
        {home.section === "create" ? <CreateView /> : null}
        {home.section === "drafts" ? <DraftsView /> : null}
      </div>
    </>
  );
}
