import {
  UGCCloneFormLazy,
  UGCCloneQueueLazy,
} from "@/components/ugc-clone-form-lazy";
import { CloneHandoffQueryProvider } from "@/lib/clone-handoff-query-context";
import { appSearchParamsToQuery } from "@/lib/search-params-query";

type UGCClonePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UGCClonePage({ searchParams }: UGCClonePageProps) {
  const initialQuery = appSearchParamsToQuery(await searchParams);
  return (
    <div className="pf-content-viewport overflow-x-hidden bg-background">
      <div className="border-b border-border bg-[var(--pf-canvas)]">
        <div className="mx-auto min-w-0 max-w-[1280px] px-4 pb-6 pt-7 sm:px-6 lg:px-8">
          <header>
            <h1 data-home-title="Clone">
              <span className="sr-only">Clone</span>
            </h1>
            <p data-clone-copy="Turn a proven source into an on-brand creator video.">
              <span className="sr-only">
                Turn a proven source into an on-brand creator video.
              </span>
            </p>
          </header>
        </div>
      </div>
      <div className="mx-auto min-w-0 max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        <CloneHandoffQueryProvider query={initialQuery}>
          <div data-clone-studio="true">
            <UGCCloneFormLazy />
          </div>
          <div data-clone-queue-slot="true" className="mt-6 pb-24">
            <UGCCloneQueueLazy />
          </div>
        </CloneHandoffQueryProvider>
      </div>
    </div>
  );
}
