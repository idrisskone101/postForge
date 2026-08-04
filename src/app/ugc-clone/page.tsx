import { UGCCloneForm } from "@/components/ugc-clone-form";
import { UGCCloneQueue } from "@/components/ugc-clone-queue";

export default function UGCClonePage() {
  return (
    <div className="pf-content-viewport overflow-x-hidden bg-background">
      <div className="mx-auto min-w-0 max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground">
              Clone Studio <span className="px-1.5 text-border">/</span> New clone
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">
              Build a new clone
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Turn a proven source into an on-brand creator video.
            </p>
          </div>
        </header>
        <UGCCloneForm />
        <div className="mt-6 pb-24">
          <UGCCloneQueue />
        </div>
      </div>
    </div>
  );
}
