import Link from "next/link";
import { galleryItemJobHref, galleryItemName } from "./format";
import type { GalleryItem } from "./types";

export function GalleryJobLink({ item }: { item: GalleryItem }) {
  return (
    <Link
      href={galleryItemJobHref(item)}
      // prefetch-off: the link is re-rendered for every inspected output; each would prefetch its job page.
      prefetch={false}
      aria-label={`Open the job for ${galleryItemName(item)}`}
      className="underline underline-offset-2 hover:text-fg"
    >
      {item.jobId.slice(0, 8)}
    </Link>
  );
}
