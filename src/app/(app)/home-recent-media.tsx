"use client";

import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";
import { MEDIA_REVEAL_CLASS, useMediaReveal } from "@/components/workbench/media-image";
import { MediaTile } from "@/components/workbench/media-tile";
import { VideoFramePreview } from "@/components/video-frame-preview";
import { outputTitle } from "@/lib/ai/output-presentation";
import { mediaHref, REVIEW_BADGE } from "./home-format";
import type { HomeMedia } from "./home-types";

export function HomeRecentMedia({ media }: { media: HomeMedia[] }) {
  if (media.length === 0) {
    return (
      <EmptyState icon="gallery" title="No media yet" className="min-h-[260px]">
        <Link href="/ugc-clone" className={buttonClass("strong")}>
          Start a clone
        </Link>
      </EmptyState>
    );
  }

  return (
    <ul className={LIST_CLASS}>
      {media.map((item, index) => (
        <li key={item.id} className={ITEM_CLASS}>
          <RecentMediaTile media={item} priority={index === 0} />
        </li>
      ))}
    </ul>
  );
}

/** Five across from 1024; below that a sideways row that bleeds to the panel edge. */
const LIST_CLASS =
  "wb-scroll-fade flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto pb-1 max-[1023px]:-mr-5 max-[1023px]:pr-5 max-[767px]:-mr-4 max-[767px]:pr-4 min-[1024px]:grid min-[1024px]:grid-cols-5 min-[1024px]:overflow-visible min-[1024px]:pb-0 min-[1024px]:[mask-image:none]";
const ITEM_CLASS = "w-[150px] shrink-0 snap-start min-[768px]:w-[180px] min-[1024px]:w-auto min-[1024px]:min-w-0";

function RecentMediaTile({ media, priority }: { media: HomeMedia; priority: boolean }) {
  const title = outputTitle(media);
  const badge = REVIEW_BADGE[media.reviewStatus] ?? REVIEW_BADGE.needs_review;
  const source = `/api/files/${encodeURIComponent(media.id)}`;
  const reveal = useMediaReveal();

  return (
    <Link
      href={mediaHref(media)}
      // prefetch-off: one link per recent output; each would prefetch its detail route on load.
      prefetch={false}
      className="wb-tile-cell group rounded-lg"
    >
      <MediaTile className="aspect-[212/316] w-full" state={{ status: badge }}>
        {media.type === "video" ? (
          <VideoFramePreview src={source} label={`${title} preview`} className="size-full object-cover" />
        ) : (
          <Image
            {...reveal.props}
            onLoad={reveal.markLoaded}
            onError={reveal.markLoaded}
            src={source}
            alt=""
            fill
            sizes="(min-width: 1024px) 20vw, 180px"
            unoptimized
            preload={priority}
            fetchPriority={priority ? "high" : undefined}
            className={`${MEDIA_REVEAL_CLASS} object-cover`}
          />
        )}
      </MediaTile>
      <span className="wb-tile-title leading-4">{title}</span>
    </Link>
  );
}
