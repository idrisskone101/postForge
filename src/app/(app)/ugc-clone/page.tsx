import {
  UGCCloneFormLazy,
  UGCCloneQueueLazy,
} from "@/components/ugc-clone-form-lazy";
import { CloneHandoffQueryProvider } from "@/lib/clone-handoff-query-context";
import { appSearchParamsToQuery } from "@/lib/search-params-query";
import { CloneOwnedHeader, CloneStudioFrame } from "./clone-owned-header";

type UGCClonePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UGCClonePage({ searchParams }: UGCClonePageProps) {
  const initialQuery = appSearchParamsToQuery(await searchParams);
  return (
    <div className="pf-content-viewport overflow-x-clip bg-[var(--pf-canvas)]">
      <div className="border-b border-border bg-[var(--pf-canvas)]">
        <div className="mx-auto min-w-0 max-w-[1280px] px-4 pb-6 sm:px-6 lg:px-8">
          <CloneOwnedHeader />
        </div>
      </div>
      <div className="mx-auto min-w-0 max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        <CloneHandoffQueryProvider query={initialQuery}>
          <CloneStudioFrame>
            <UGCCloneFormLazy />
          </CloneStudioFrame>
          <div data-clone-queue-slot="true" className="mt-6 pb-24">
            <UGCCloneQueueLazy />
          </div>
        </CloneHandoffQueryProvider>
      </div>
    </div>
  );
}
