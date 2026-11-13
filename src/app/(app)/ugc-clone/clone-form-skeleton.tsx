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

// The form always opens on the source step, whose panel holds the step rail, the URL row and the fixed
// 512px source grid. These are its measured heights; the URL row stacks below 640 and the action bar
// below 768.
const SOURCE_STEP_PANEL_HEIGHT = "h-[803px] max-sm:h-[835px]";
const ACTION_BAR_HEIGHT = "h-[140px] max-md:h-[296px]";
