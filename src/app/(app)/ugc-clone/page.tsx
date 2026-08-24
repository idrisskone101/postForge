import { UGCCloneForm } from "@/components/ugc-clone-form";
import { UGCCloneQueue } from "@/components/ugc-clone-queue";
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
            <h1
              className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[30px]"
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "#18181b",
              }}
            >
              Clone
            </h1>
            <p className="mt-1.5 line-clamp-1 max-w-[8rem] text-[10px] leading-none text-muted-foreground">
              Turn a proven source into an on-brand creator video.
            </p>
          </header>
        </div>
      </div>
      <div className="mx-auto min-w-0 max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        <CloneHandoffQueryProvider query={initialQuery}>
          <UGCCloneForm />
          <div className="mt-6 pb-24">
            <UGCCloneQueue />
          </div>
        </CloneHandoffQueryProvider>
      </div>
    </div>
  );
}
