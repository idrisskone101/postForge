import Link from "next/link";
import { buttonClass } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";
import { Panel } from "@/components/workbench/panel";

export default function NotFound() {
  return (
    <Panel className="flex-1 max-[767px]:px-4">
      <EmptyState icon="search" title="Page not found" className="min-h-[320px]">
        <Link href="/" className={buttonClass("strong")}>
          Go to Home
        </Link>
      </EmptyState>
    </Panel>
  );
}
