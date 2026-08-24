import { canRenderSlideshowVideo } from "@/lib/ai/slideshow-renderer";
import {
  createBlankSlideshowProject,
  SlideshowStudio,
} from "@/components/slideshow";
import { parseSlideshowViewMode } from "@/components/slideshow/slideshow-view";

export const metadata = { title: "Slideshow Studio - PostForge" };
export const dynamic = "force-dynamic";

type SlideshowPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SlideshowPage({
  searchParams,
}: SlideshowPageProps) {
  const params = await searchParams;
  const startNew = params.new === "true" || params.new === "1";

  return (
    <SlideshowStudio
      initialProjects={[]}
      initialProject={startNew ? createBlankSlideshowProject() : null}
      initialViewMode={parseSlideshowViewMode(params.view)}
      supportsMp4Export={await canRenderSlideshowVideo()}
    />
  );
}
