import { Suspense } from "react";
import { ffmpegBinaryExists } from "@/lib/ai/slideshow-renderer";
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

export default function SlideshowPage({ searchParams }: SlideshowPageProps) {
  return (
    <Suspense fallback={<SlideshowStudioShell />}>
      <SlideshowPageInner searchParams={searchParams} />
    </Suspense>
  );
}

function SlideshowStudioShell({
  startNew = false,
  view,
}: {
  startNew?: boolean;
  view?: string | string[];
}) {
  return (
    <SlideshowStudio
      initialProjects={[]}
      initialProject={startNew ? createBlankSlideshowProject() : null}
      initialViewMode={parseSlideshowViewMode(view)}
      supportsMp4Export={ffmpegBinaryExists()}
    />
  );
}

async function SlideshowPageInner({ searchParams }: SlideshowPageProps) {
  const params = await searchParams;
  const startNew = params.new === "true" || params.new === "1";
  return <SlideshowStudioShell startNew={startNew} view={params.view} />;
}
