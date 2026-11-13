import Link from "next/link";
import { buttonClass } from "@/components/workbench/button";
import { Icon } from "@/components/workbench/icon";
import { PageHeader } from "@/components/workbench/page-header";
import { Panel } from "@/components/workbench/panel";
import {
  GalleryTileSkeletons,
  GalleryToolbarSkeleton,
} from "@/components/gallery/skeletons";
import { getActiveWorkspaceItem } from "@/lib/workspace-navigation";

export function GalleryFirstPaint() {
  const title = getActiveWorkspaceItem("/gallery")?.label ?? "Gallery";

  return (
    <>
      <PageHeader title={title}>
        <Link
          href="/ugc-clone"
          // prefetch-off: the clone studio is heavy and most visits stay in review.
          prefetch={false}
          className={buttonClass("primary", 40)}
        >
          <Icon name="plus" strokeWidth={2} />
          Start clone
        </Link>
      </PageHeader>
      <div
        data-gallery-first-body="true"
        aria-busy="true"
        className="flex min-h-0 min-w-0 flex-1 gap-3"
      >
        <Panel className="min-w-0 flex-1 gap-3">
          <GalleryToolbarSkeleton />
          <GalleryTileSkeletons />
        </Panel>
      </div>
    </>
  );
}
