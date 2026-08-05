import Link from "next/link";
import { CircleHelp, History } from "lucide-react";
import { GenerationForm } from "@/components/generation-form";
import { WorkspaceHeaderAccessory } from "@/components/workspace-shell";
import { getAvailableModels } from "@/lib/ai/model-availability";

export default async function GeneratePage() {
  const models = await getAvailableModels();

  return (
    <div className="min-w-0 animate-fade-in-up px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:pb-8">
      <WorkspaceHeaderAccessory>
        <div className="flex items-center gap-2">
          <Link
            href="/gallery"
            className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-[#D6D7CF] bg-white px-3 text-[11px] font-semibold text-[#3F403C] transition-colors hover:bg-[#F8F9F5]"
          >
            <History className="size-3.5" /> History
          </Link>
          <Link
            href="/settings"
            aria-label="Generation help"
            className="grid size-9 place-items-center rounded-[9px] border border-[#D6D7CF] bg-white text-[#686965] transition-colors hover:bg-[#F8F9F5] hover:text-[#232323]"
          >
            <CircleHelp className="size-3.5" />
          </Link>
        </div>
      </WorkspaceHeaderAccessory>
      <GenerationForm models={models} />
    </div>
  );
}
