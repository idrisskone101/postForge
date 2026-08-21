"use client";

import { CreateView } from "./create-view";
import { DraftsView } from "./drafts-view";
import { StudioSectionNav } from "./studio-section-nav";
import type { StudioHomeView } from "./view-models";

export function StudioHome({ home }: { home: StudioHomeView }) {
  return (
    <>
      <StudioSectionNav home={home} />
      <div className="mx-auto w-full max-w-[1240px] px-4 pb-16 sm:px-6 lg:px-8">
        {home.section === "create" ? <CreateView home={home} /> : null}
        {home.section === "drafts" ? <DraftsView home={home} /> : null}
      </div>
    </>
  );
}
