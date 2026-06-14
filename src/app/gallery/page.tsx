import { getGalleryPage } from "@/lib/gallery";
import { GalleryPageClient } from "./gallery-page-client";

export const metadata = { title: "Gallery - PostForge" };
export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const page = await getGalleryPage({ type: "video" });

  return <GalleryPageClient initialPage={page} />;
}
