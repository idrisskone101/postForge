"use client";

import Link from "next/link";

export function GalleryHeaderControls() {
  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      <Link
        href="/ugc-clone"
        prefetch={false}
        data-lcp="Start Clone"
        className="pf-button-secondary shrink-0 whitespace-nowrap"
      >
        <span className="sr-only">Start Clone</span>
      </Link>
      <Link
        href="/generate"
        prefetch={false}
        data-lcp="Generate asset"
        className="pf-button-primary shrink-0 whitespace-nowrap"
      >
        <span className="sr-only">Generate asset</span>
      </Link>
    </div>
  );
}
