"use client";

import Link from "next/link";
import { Button, buttonClass } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";
import { Icon } from "@/components/workbench/icon";
import { Panel } from "@/components/workbench/panel";

/** No connected account and no CSV: say so plainly and offer both real ways in. */
export function PerformanceEmptyState({
  importing,
  onImport,
  onDownloadTemplate,
}: {
  importing: boolean;
  onImport: () => void;
  onDownloadTemplate: () => void;
}) {
  return (
    <Panel pad="none" className="min-w-0 flex-1 gap-3 p-5 max-md:p-4" aria-label="Get started">
      <EmptyState
        icon="performance"
        title="No performance data yet"
        detail="Connect TikTok, Instagram or YouTube in Settings, or import a local CSV report."
        className="min-h-[300px] flex-1"
      >
        <Link href="/settings?tab=integrations" className={buttonClass("strong")}>
          Open integrations
        </Link>
        <Button className="gap-2 pl-3.5 pr-[18px]" onClick={onImport} disabled={importing}>
          <Icon name="upload" size={16} />
          {importing ? "Importing" : "Import CSV"}
        </Button>
      </EmptyState>
      <div className="flex items-center gap-3 rounded-lg bg-well px-3.5 py-3 max-md:flex-col max-md:items-start max-md:gap-1.5">
        <span className="wb-label shrink-0">CSV columns</span>
        <code className="wb-mono min-w-0 flex-1 text-fg-secondary [overflow-wrap:anywhere]">
          {CSV_COLUMNS}
        </code>
        <Button variant="link" className="h-auto shrink-0 px-0 text-[13px]" onClick={onDownloadTemplate}>
          Download template
        </Button>
      </div>
    </Panel>
  );
}

const CSV_COLUMNS = "title, views, likes, comments, shares, saves, publishedAt";
