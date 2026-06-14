import { UGCCloneForm } from "@/components/ugc-clone-form";

export default function UGCClonePage() {
  return (
    <div className="min-h-[calc(100vh-76px)] overflow-x-hidden bg-[oklch(0.145_0_0)]">
      <div className="mx-auto min-w-0 max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <UGCCloneForm />
      </div>
    </div>
  );
}
