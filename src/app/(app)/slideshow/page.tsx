import { ffmpegBinaryExists } from "@/lib/ai/slideshow-renderer";
import { SlideshowStudioLazy } from "@/components/slideshow/slideshow-studio-lazy";

import { SlideshowNewProvider } from "./slideshow-new-context";

export const metadata = { title: "Slideshow Studio - PostForge" };
export const dynamic = "force-dynamic";

export default function SlideshowPage() {
  return (
    <SlideshowNewProvider>
      <SlideshowStudioLazy
        initialProjects={[]}
        initialProject={null}
        initialViewMode="edit"
        supportsMp4Export={ffmpegBinaryExists()}
      />
    </SlideshowNewProvider>
  );
}
