"use client";

import { useRouter } from "next/navigation";
import { IconButton } from "@/components/workbench";

/** The page header with a history back button: the output is reached from Clone, Jobs, Home and Gallery. */
export function CloneOutputHeader() {
  const router = useRouter();
  return (
    <header className="wb-page-header" data-back="true">
      <div className="wb-page-header-lead">
        <IconButton icon="chevron-left" label="Back" size={40} onClick={() => router.back()} />
        <h1 className="wb-page-title">Clone output</h1>
      </div>
    </header>
  );
}
