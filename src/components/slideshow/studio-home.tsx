"use client";

import { CreateView, DraftsView } from "./slideshow-studio-islands";
import { StudioSectionNav } from "./studio-section-nav";
import { useSlideshowHome } from "./slideshow-home-provider";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";

export function StudioHome() {
  const paintReady = useWindowLoadReady();
  const home = useSlideshowHome();
  return (
    <>
      <StudioSectionNav />
      <div
        data-slideshow-home-body={paintReady ? undefined : "true"}
        className="w-full pb-16"
      >
        {home.section === "create" ? <CreateView /> : null}
        {home.section === "drafts" ? <DraftsView /> : null}
      </div>
    </>
  );
}
