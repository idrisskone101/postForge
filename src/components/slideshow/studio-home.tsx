"use client";

import dynamic from "next/dynamic";

import { CreateView } from "./create-view";
import { StudioSectionNav } from "./studio-section-nav";
import { useSlideshowHome } from "./slideshow-home-provider";

const DraftsView = dynamic(() =>
  import("./drafts-view").then((mod) => ({ default: mod.DraftsView })),
);

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
