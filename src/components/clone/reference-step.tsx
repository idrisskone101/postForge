import { cn } from "@/lib/utils";
import { CloneReferenceProvider } from "@/components/clone/clone-reference-provider";
import { CloneReferenceInputs } from "@/components/clone/reference-inputs";
import { CloneReferenceLibrary } from "@/components/clone/reference-library";
import { CloneReferenceOptions } from "@/components/clone/reference-options";
import { CLONE_STEP_FOCUS_CLASS, useCloneStepEntry } from "@/components/clone/use-clone-step-entry";
import type { CloneReferenceWorkspace } from "@/components/clone/view-models";

export function CloneReferenceStep({
  workspace,
  hidden,
}: {
  workspace: CloneReferenceWorkspace;
  hidden: boolean;
}) {
  const stepEntry = useCloneStepEntry("reference", hidden);
  return (
    <CloneReferenceProvider workspace={workspace}>
      <section
        {...stepEntry}
        data-clone-reference-section="true"
        className={cn("flex min-w-0 flex-col gap-4", CLONE_STEP_FOCUS_CLASS, hidden && "hidden")}
      >
        <CloneReferenceInputs />
        <CloneReferenceOptions />
        <CloneReferenceLibrary />
      </section>
    </CloneReferenceProvider>
  );
}
