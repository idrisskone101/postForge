import type { ReactNode } from "react";
import { PageHeader } from "@/components/workbench/page-header";
import { Panel } from "@/components/workbench/panel";
import { Skeleton } from "@/components/workbench/skeleton";

export function SlideshowAutomationBuilderChrome({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <div data-slideshow-automation-builder="true" className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader title={title} back={BACK} />
      <div className="flex min-h-0 flex-1 flex-col gap-3 xl:flex-row">{children}</div>
    </div>
  );
}

export function SlideshowAutomationBuilderSkeleton() {
  return (
    <SlideshowAutomationBuilderChrome
      title={<Skeleton className="inline-block h-7 w-64 max-w-full align-middle" />}
    >
      <Panel pad="roomy" aria-busy="true" aria-label="Loading automation" className="flex-1 gap-6">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Skeleton shape="tile" className="h-[64px] flex-1" />
          <Skeleton shape="tile" className="h-[64px] flex-1" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton shape="tile" className="h-[60px]" />
          <Skeleton shape="tile" className="h-[60px]" />
        </div>
        <Skeleton shape="tile" className="h-[128px]" />
      </Panel>
      <div className="flex shrink-0 flex-col gap-3 xl:w-[372px]">
        <Panel pad="none" className="gap-3 p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton shape="tile" className="h-9" />
          <Skeleton shape="tile" className="h-[64px] w-[132px]" />
        </Panel>
        <Panel pad="none" className="gap-3 p-5">
          <Skeleton className="h-4 w-20" />
          <Skeleton shape="tile" className="h-[90px]" />
        </Panel>
      </div>
    </SlideshowAutomationBuilderChrome>
  );
}

const BACK = { href: "/automations", label: "Back to automations" };
