import { UGCCloneForm } from "@/components/ugc-clone-form";
import { UGCCloneQueue } from "@/components/ugc-clone-queue";

export default function UGCClonePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <div className="mx-auto max-w-[1240px] px-4 pb-28 pt-6 sm:px-6 lg:py-8">
        <header className="mb-5">
          <h1 className="text-2xl font-extrabold tracking-tight">UGC Clone</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Add a TikTok source and avatar. Keep everything else collapsed until you need it.
          </p>
        </header>

        <UGCCloneForm />

        <div className="mt-8">
          <UGCCloneQueue />
        </div>
      </div>
    </div>
  );
}
