import { Suspense } from "react";
import { COLLECTIONS_HAIRLINE_CSS } from "./collections-panel";
import { CollectionsPageLazy } from "./collections-page-lazy";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";

export const metadata = { title: "Collections - PostForge" };

export default function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ upload?: string }>;
}) {
  return (
    <>
      <style>{COLLECTIONS_HAIRLINE_CSS}</style>
      <Suspense fallback={<WorkspaceRouteSkeleton />}>
        <CollectionsPageWithParams searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CollectionsPageWithParams({
  searchParams,
}: {
  searchParams: Promise<{ upload?: string }>;
}) {
  const params = await searchParams;
  return <CollectionsPageLazy initialRecords={[]} openUploader={params.upload === "1"} />;
}
