import { Suspense } from "react";
import Link from "next/link";
import { CircleHelp, History } from "lucide-react";
import { GenerationFormLazy } from "@/components/generation-form-lazy";
import { WorkspaceHeaderAccessory } from "@/components/workspace-header-accessory";
import { getAvailableModelsNow } from "@/lib/ai/model-availability";
import { appSearchParamsToQuery } from "@/lib/search-params-query";
import { GenerateFormSkeleton } from "./generate-form-skeleton";

type GeneratePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function GeneratePage({ searchParams }: GeneratePageProps) {
  return (
    <div data-workspace-page="true" className="min-w-0 px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:pb-8">
      <WorkspaceHeaderAccessory>
        <div className="flex items-center gap-2">
          <Link
            href="/gallery"
            prefetch={false}
            data-generate-history="History"
            className="pf-button-secondary h-9"
          >
            <History className="size-3.5" />
            <span className="sr-only">History</span>
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
      <Suspense fallback={<GenerateFormSkeleton />}>
        <GenerateFormSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function GenerateFormSection({
  searchParams,
}: {
  searchParams: GeneratePageProps["searchParams"];
}) {
  const params = await searchParams;
  const models = getAvailableModelsNow();
  const initialQuery = appSearchParamsToQuery(params);

  return <GenerationFormLazy models={models} initialQuery={initialQuery} />;
}
