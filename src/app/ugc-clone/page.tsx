import { UGCCloneForm } from "@/components/ugc-clone-form";
import { UGCCloneQueue } from "@/components/ugc-clone-queue";

export default function UGCClonePage() {
  return (
    <div className="min-h-[calc(100vh-76px)] overflow-x-hidden bg-[oklch(0.145_0_0)]">
      <div className="mx-auto min-w-0 max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <UGCCloneForm />

        <div className="mt-8">
          <UGCCloneQueue />
        </div>
      </div>
    </div>
  );
}
