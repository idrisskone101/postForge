import { Skeleton } from "@/components/workbench/skeleton";

/** Static route placeholder: one panel block under the page header. */
export function WorkspaceRouteSkeleton() {
  return (
    <div data-route-skeleton="true" aria-hidden="true" className="flex min-h-[320px] flex-1">
      <Skeleton shape="panel" className="flex-1" />
    </div>
  );
}
