"use client";

import { Skeleton } from "@/components/workbench/skeleton";
import { cn } from "@/lib/utils";

import { DraftCell } from "./draft-cell";
import { useSlideshowHome } from "./slideshow-home-provider";

export function RecentDrafts() {
  const { projects, loadingProjects, projectsError, onOpenDraft } = useSlideshowHome();
  const recent = projects.slice(0, 3);
  if (!loadingProjects && !projectsError && !recent.length) return null;

  return (
    <section
      aria-label="Recent drafts"
      className="wb-panel gap-3 px-4 pb-[22px] pt-[18px] sm:px-6"
    >
      <div className="flex h-8 items-center">
        <h2 className="wb-panel-title">Recent drafts</h2>
      </div>
      {projectsError ? (
        <p role="alert" className="wb-notice" data-tone="bad">
          <strong>Drafts could not load.</strong> {projectsError}
        </p>
      ) : null}
      {loadingProjects && !recent.length ? (
        <div className="flex flex-col gap-4 lg:flex-row" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-1 items-center gap-3.5">
              <Skeleton shape="tile" className="h-[110px] w-[88px] flex-none" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="wb-fade-in flex flex-col gap-4 lg:flex-row">
          {recent.map((project, index) => (
            <DraftCell
              key={project.id}
              project={project}
              onOpen={onOpenDraft}
              size="recent"
              thumbs={index === 0 ? 3 : 1}
              className={cn(
                index === 0
                  ? "lg:flex-[1.4_1_0%]"
                  : "lg:flex-[1_1_0%] lg:rounded-l-none lg:border-l lg:border-hairline lg:pl-4",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
