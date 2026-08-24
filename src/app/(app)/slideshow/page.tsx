import { ffmpegBinaryExists } from "@/lib/ai/slideshow-renderer";
import { SlideshowStudio } from "@/components/slideshow";

export const metadata = { title: "Slideshow Studio - PostForge" };
export const dynamic = "force-dynamic";

export default function SlideshowPage() {
  return (
    <SlideshowStudio
      initialProjects={[]}
      initialProject={null}
      initialViewMode="edit"
      supportsMp4Export={ffmpegBinaryExists()}
    />
  );
}
