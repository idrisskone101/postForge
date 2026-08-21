import { Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WorkspaceState } from "@/components/workspace-state";
import { cn } from "@/lib/utils";
import type { CloneProductionState } from "@/components/clone/view-models";

type CloneProductionStepStatus = "ready" | "required" | "working" | "optional";

function getStepStatus(isReady: boolean, readyStatus: CloneProductionStepStatus = "ready") {
  return isReady ? readyStatus : "required";
}

function ProductionStateRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: CloneProductionStepStatus;
  detail: string;
}) {
  const statusClassName = {
    ready: "border-accent-green/30 bg-accent-green/10 text-accent-green",
    required: "border-accent-coral/30 bg-accent-coral/10 text-accent-coral",
    working: "border-accent-blue/30 bg-accent-blue/10 text-accent-blue",
    optional: "border-border bg-muted/45 text-muted-foreground",
  }[status];

  const statusLabel = {
    ready: "Ready",
    required: "Required",
    working: "Working",
    optional: "Optional",
  }[status];

  return (
    <li className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-bold uppercase tracking-wider",
            statusClassName
          )}
        >
          {statusLabel}
        </span>
      </div>
    </li>
  );
}

export function CloneProductionStatePanel({
  production,
}: {
  production: CloneProductionState;
}) {
  const {
    sourceReady,
    trimReady,
    identityReady,
    referenceReady,
    canGenerate,
    nextAction,
    sourceDetail = sourceReady ? "Source selected and available for preview." : "No TikTok source selected yet.",
    trimDetail = trimReady ? "Trim/preparation state is set." : "Choose a source before trimming.",
    identityDetail = identityReady ? "Identity selected for this clone." : "Select an avatar identity.",
    referenceDetail = referenceReady ? "Reference is ready for generation." : "Generate or choose a reference.",
    readinessDetail = canGenerate ? "All required production state is ready." : "Complete the required state to generate.",
  } = production;
  return (
    <aside
      data-clone-production-state="true"
      className="h-fit rounded-lg border border-border bg-card p-4 shadow-sm xl:sticky xl:top-24"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
            Production State
          </p>
          <h2 className="mt-1 text-lg font-semibold">Clone readiness</h2>
        </div>
        <Badge
          variant="outline"
          className={cn(
            canGenerate
              ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
              : "bg-muted/45 text-muted-foreground"
          )}
        >
          {canGenerate ? "Ready" : "In progress"}
        </Badge>
      </div>

      <ol className="mt-4 space-y-2">
        <ProductionStateRow
          label="Source"
          status={getStepStatus(sourceReady)}
          detail={sourceDetail}
        />
        <ProductionStateRow
          label="Trim"
          status={sourceReady ? (trimReady ? "ready" : "required") : "required"}
          detail={trimDetail}
        />
        <ProductionStateRow
          label="Identity"
          status={getStepStatus(identityReady)}
          detail={identityDetail}
        />
        <ProductionStateRow
          label="Reference"
          status={getStepStatus(referenceReady)}
          detail={referenceDetail}
        />
        <ProductionStateRow
          label="Generate readiness"
          status={canGenerate ? "ready" : "working"}
          detail={readinessDetail}
        />
      </ol>

      {!sourceReady ? (
        <WorkspaceState
          tone="empty"
          icon={Video}
          title={nextAction.label}
          description={nextAction.detail}
          className="mt-4 min-h-40 border-0 bg-muted/25 px-3 py-5"
        />
      ) : (
        <div className="mt-4 rounded-lg border border-border bg-muted/25 p-3">
          <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
            Next action
          </p>
          <p className="mt-1 text-sm font-semibold">{nextAction.label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {nextAction.detail}
          </p>
        </div>
      )}
    </aside>
  );
}
