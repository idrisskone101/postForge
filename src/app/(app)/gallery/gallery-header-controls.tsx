"use client";

import Link from "next/link";

export function GalleryHeaderControls() {
  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      <Link
        href="/ugc-clone"
        prefetch={false}
        className="pf-button-secondary shrink-0 whitespace-nowrap"
      >
        Start Clone
      </Link>
      <Link
        href="/generate"
        prefetch={false}
        className="pf-button-primary shrink-0 whitespace-nowrap"
      >
        Generate asset
      </Link>
    </div>
  );
}
