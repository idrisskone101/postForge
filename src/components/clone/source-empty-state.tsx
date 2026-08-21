import { Video } from "lucide-react";
import { WorkspaceState } from "@/components/workspace-state";

export function CloneSourceEmptyState() {
  return (
    <WorkspaceState
      tone="empty"
      icon={Video}
      title="Add source"
      description="Your selected clip appears here."
      className="min-h-0 border-0 bg-transparent px-0 py-0"
    />
  );
}
