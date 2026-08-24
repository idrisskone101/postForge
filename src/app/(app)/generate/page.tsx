import { Suspense } from "react";
import Link from "next/link";
import { CircleHelp, History } from "lucide-react";
import { GenerationForm } from "@/components/generation-form";
import { WorkspaceHeaderAccessory } from "@/components/workspace-header-accessory";
import { getAvailableModels } from "@/lib/ai/model-availability";

export default async function GeneratePage() {
  const models = await getAvailableModels();

  return (
    <div className="min-w-0 px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:pb-8">
      <WorkspaceHeaderAccessory>
        <div className="flex items-center gap-2">
          <Link
            href="/gallery"
            prefetch={false}
            className="pf-button-secondary h-9"
          >
            <History className="size-3.5" /> History
          </Link>
          <Link
            href="/settings"
            prefetch={false}
            aria-label="Generation help"
            className="pf-button-secondary size-9 px-0"
          >
            <CircleHelp className="size-3.5" />
          </Link>
        </div>
      </WorkspaceHeaderAccessory>
      <Suspense
        fallback={
          <div className="px-1 py-6">
            <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">
              Generate
            </h1>
            <p className="mt-1.5 max-w-sm text-[11px] leading-4 text-muted-foreground">
              Loading the studio.
            </p>
          </div>
        }
      >
        <GenerationForm models={models} />
      </Suspense>
    </div>
  );
}
