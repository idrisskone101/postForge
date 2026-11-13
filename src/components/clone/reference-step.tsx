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
        aria-labelledby="clone-reference-heading"
        className={cn("flex min-w-0 flex-col gap-4", hidden && "hidden")}
      >
        <CloneReferenceInputs />
        <CloneReferenceOptions />
        <CloneReferenceLibrary />
      </section>
    </CloneReferenceProvider>
  );
}
