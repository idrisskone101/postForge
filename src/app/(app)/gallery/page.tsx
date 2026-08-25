import {
  getGalleryPage,
  normalizeGalleryReviewStatusFilter,
} from "@/lib/gallery";
import { GalleryPageLazy } from "./gallery-page-lazy";

export const metadata = { title: "Gallery - PostForge" };
export const dynamic = "force-dynamic";

type GallerySearchParams = Promise<{
  type?: string | string[];
  sort?: string | string[];
  reviewStatus?: string | string[];
}>;

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: GallerySearchParams;
}) {
  const requested = await searchParams;
  const requestedType = Array.isArray(requested.type)
    ? requested.type[0]
    : requested.type;
  const requestedSort = Array.isArray(requested.sort)
    ? requested.sort[0]
    : requested.sort;
  const requestedReviewStatus = Array.isArray(requested.reviewStatus)
    ? requested.reviewStatus[0]
    : requested.reviewStatus;
  const type =
    requestedType === "image" || requestedType === "all"
      ? requestedType
      : "video";
  const sort = requestedSort === "oldest" ? "oldest" : "newest";
  const reviewStatus = normalizeGalleryReviewStatusFilter(
    requestedReviewStatus,
    "needs_review"
  );
  const page = await getGalleryPage({ type, sort, reviewStatus });

  return (
    <GalleryPageLazy
      initialPage={page}
      initialType={type}
      initialSort={sort}
      initialReviewStatus={reviewStatus}
    />
  );
}
