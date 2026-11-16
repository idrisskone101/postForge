import { Skeleton } from "@/components/workbench";

export function CloneFormSkeleton() {
  return (
    <div
      data-clone-form-skeleton="true"
      aria-hidden="true"
      className="flex min-w-0 gap-3 max-xl:flex-col"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Skeleton shape="panel" className={SOURCE_STEP_PANEL_HEIGHT} />
        <Skeleton shape="panel" className={ACTION_BAR_HEIGHT} />
      </div>
      <div className="flex w-[380px] shrink-0 flex-col gap-3 max-xl:w-full">
        <Skeleton shape="panel" className="h-[422px]" />
        <Skeleton shape="panel" className="h-[262px]" />
      </div>
    </div>
  );
}

export function CloneQueueSkeleton() {
  return (
    <Skeleton
      shape="panel"
      className="h-[273px]"
    />
  );
}

// The form always opens on the source step, whose panel holds the step rail, the URL row and the saved
// sources. These are its measured heights: from 640 the fixed 512px source grid is open, below 640 the
// saved sources open collapsed and the URL row stacks. The action bar stacks below 768.
const SOURCE_STEP_PANEL_HEIGHT = "h-[803px] max-sm:h-[313px]";
const ACTION_BAR_HEIGHT = "h-[140px] max-md:h-[296px]";
