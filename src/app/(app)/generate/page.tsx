import { Suspense } from "react";
import { GenerationFormLazy } from "@/components/generation-form-lazy";
import { WorkspaceHeaderAccessory } from "@/components/workspace-header-accessory";
import { getAvailableModels } from "@/lib/ai/model-availability";
import { appSearchParamsToQuery } from "@/lib/search-params-query";
import { GenerateHeaderAccessory } from "./generate-header-accessory";
import { GenerateFormSkeleton } from "./generate-form-skeleton";

type GeneratePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function GeneratePage({ searchParams }: GeneratePageProps) {
  return (
    <>
      <WorkspaceHeaderAccessory>
        <GenerateHeaderAccessory />
      </WorkspaceHeaderAccessory>
      <Suspense fallback={<GenerateFormSkeleton />}>
        <GenerateFormSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function GenerateFormSection({
  searchParams,
}: {
  searchParams: GeneratePageProps["searchParams"];
}) {
  const [params, models] = await Promise.all([searchParams, getAvailableModels()]);
  const initialQuery = appSearchParamsToQuery(params);

  return <GenerationFormLazy models={models} initialQuery={initialQuery} />;
}
