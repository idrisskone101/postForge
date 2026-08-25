import { ffmpegBinaryExists } from "@/lib/ai/slideshow-renderer";
import { SlideshowStudioLazy } from "@/components/slideshow/slideshow-studio-lazy";

export const metadata = { title: "Slideshow Studio - PostForge" };
export const dynamic = "force-dynamic";

export default function SlideshowPage() {
  return (
    <SlideshowStudioLazy
      initialProjects={[]}
      initialProject={null}
      initialViewMode="edit"
      supportsMp4Export={ffmpegBinaryExists()}
    />
  );
}
