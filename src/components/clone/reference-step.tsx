import { cn } from "@/lib/utils";
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
    <section
      data-clone-reference-section="true"
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-[var(--pf-shadow-2xs)] sm:p-5",
        hidden && "hidden"
      )}
    >
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            Reference
          </h2>
          <p className="text-xs text-muted-foreground">Set the look before generating video.</p>
        </div>
      </div>

      <div className="grid items-start gap-4">
        <CloneReferenceInputs workspace={workspace} />
        <CloneReferenceOptions workspace={workspace} />
        <CloneReferenceLibrary workspace={workspace} />
      </div>
    </section>
  );
}
