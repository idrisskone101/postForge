import { ffmpegBinaryExists } from "@/lib/ai/slideshow-renderer";
import { SlideshowStudioLazy } from "@/components/slideshow/slideshow-studio-lazy";

import { SlideshowNewProvider } from "./slideshow-new-context";
import { SlideshowOwnedHeader, SlideshowStudioFrame } from "./slideshow-owned-header";

export const metadata = { title: "Slideshow Studio - PostForge" };
export const dynamic = "force-dynamic";

export default function SlideshowPage() {
  return (
    <SlideshowNewProvider>
      <div className="pf-content-viewport overflow-x-clip bg-[var(--pf-canvas)]">
        <div className="border-b border-border bg-[var(--pf-canvas)]">
          <div className="mx-auto min-w-0 max-w-[1280px] px-4 pb-6 sm:px-6 lg:px-8">
            <SlideshowOwnedHeader />
          </div>
        </div>
        <div className="mx-auto min-w-0 max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <SlideshowStudioFrame>
            <SlideshowStudioLazy
              initialProjects={[]}
              initialProject={null}
              initialViewMode="edit"
              supportsMp4Export={ffmpegBinaryExists()}
            />
          </SlideshowStudioFrame>
        </div>
      </div>
    </SlideshowNewProvider>
  );
}
