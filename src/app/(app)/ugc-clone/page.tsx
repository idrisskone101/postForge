import { Suspense } from "react";
import { UGCCloneForm } from "@/components/ugc-clone-form";
import { UGCCloneQueue } from "@/components/ugc-clone-queue";

export default function UGCClonePage() {
  return (
    <div className="pf-content-viewport overflow-x-hidden bg-background">
      <div className="border-b border-border bg-[var(--pf-canvas)]">
        <div className="mx-auto min-w-0 max-w-[1280px] px-4 pb-6 pt-7 sm:px-6 lg:px-8">
          <header>
            <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[30px]">
              Clone
            </h1>
            <p className="mt-1.5 line-clamp-1 max-w-[8rem] text-[10px] leading-none text-muted-foreground">
              Turn a proven source into an on-brand creator video.
            </p>
          </header>
        </div>
      </div>
      <div className="mx-auto min-w-0 max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        <Suspense fallback={null}>
          <UGCCloneForm />
          <div className="mt-6 pb-24">
            <UGCCloneQueue />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
