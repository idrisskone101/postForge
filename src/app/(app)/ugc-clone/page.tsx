import {
  UGCCloneFormLazy,
  UGCCloneQueueLazy,
} from "@/components/ugc-clone-form-lazy";
import { PageHeader } from "@/components/workbench";
import { CloneHandoffQueryProvider } from "@/lib/clone-handoff-query-context";
import { appSearchParamsToQuery } from "@/lib/search-params-query";
import { CloneStartOver } from "./clone-owned-header";

type UGCClonePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UGCClonePage({ searchParams }: UGCClonePageProps) {
  const initialQuery = appSearchParamsToQuery(await searchParams);
  return (
    <>
      <PageHeader title="Clone">
        <CloneStartOver />
      </PageHeader>
      <CloneHandoffQueryProvider query={initialQuery}>
        <UGCCloneFormLazy />
        <UGCCloneQueueLazy />
      </CloneHandoffQueryProvider>
    </>
  );
}
