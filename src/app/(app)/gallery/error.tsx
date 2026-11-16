"use client";

import Link from "next/link";
import { Button, buttonClass } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";
import { PageHeader } from "@/components/workbench/page-header";
import { Panel } from "@/components/workbench/panel";

export default function GalleryError({ reset }: { reset: () => void }) {
  return (
    <>
      <PageHeader title="Gallery" />
      <Panel className="min-w-0 flex-1">
        <EmptyState
          icon="alert"
          tone="error"
          title="Gallery failed to load"
          detail="Your assets are safe. Check the connection and try again."
          className="min-h-[520px]"
        >
          <Button variant="strong" onClick={reset}>
            Retry Gallery
          </Button>
          <Link href="/" className={buttonClass("quiet")}>
            Back to Home
          </Link>
        </EmptyState>
      </Panel>
    </>
  );
}
