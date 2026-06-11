import { UGCCloneForm } from "@/components/ugc-clone-form";
import { UGCCloneQueue } from "@/components/ugc-clone-queue";

export default function UGCClonePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <div className="mx-auto min-w-0 max-w-[860px] px-3 pb-16 pt-3 sm:px-5 sm:pt-5 lg:pb-20">
        <UGCCloneForm />

        <div className="mt-4">
          <UGCCloneQueue />
        </div>
      </div>
    </div>
  );
}
