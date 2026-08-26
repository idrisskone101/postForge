import { Suspense } from "react";
import { GenerationFormLazy } from "@/components/generation-form-lazy";
import { WorkspaceHeaderAccessory } from "@/components/workspace-header-accessory";
import { getAvailableModelsNow } from "@/lib/ai/model-availability";
import { appSearchParamsToQuery } from "@/lib/search-params-query";
import { GenerateHeaderAccessory } from "./generate-header-accessory";
import { GenerateFormSkeleton } from "./generate-form-skeleton";

type GeneratePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function GeneratePage({ searchParams }: GeneratePageProps) {
  return (
    <div data-workspace-page="true" className="min-w-0 px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:pb-8">
      <WorkspaceHeaderAccessory>
        <GenerateHeaderAccessory />
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
