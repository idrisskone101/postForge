import { cn } from "@/lib/utils";
import { CloneReferenceProvider } from "@/components/clone/clone-reference-provider";
import { CloneReferenceInputs } from "@/components/clone/reference-inputs";
import { CloneReferenceLibrary } from "@/components/clone/reference-library";
import { CloneReferenceOptions } from "@/components/clone/reference-options";
import type { CloneReferenceWorkspace } from "@/components/clone/view-models";

export function CloneReferenceStep({
  workspace,
  hidden,
}: {
  workspace: CloneReferenceWorkspace;
  hidden: boolean;
}) {
  return (
    <CloneReferenceProvider workspace={workspace}>
      <section
        data-clone-reference-section="true"
        className={cn(
          "pf-card p-4 sm:p-5",
          hidden && "hidden"
        )}
      >
        <div className="mb-6 flex items-center gap-3">
          <div>
            <h2 className="pf-section-title">Reference</h2>
            <p className="mt-1 text-[12px] leading-4 text-muted-foreground">
              Set the look before generating video.
            </p>
          </div>
        </div>

        <div className="grid items-start gap-4">
          <CloneReferenceInputs />
          <CloneReferenceOptions />
          <CloneReferenceLibrary />
        </div>
      </section>
    </CloneReferenceProvider>
  );
}
