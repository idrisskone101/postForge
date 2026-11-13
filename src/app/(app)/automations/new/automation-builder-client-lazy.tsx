"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { AutomationBuilderSearch } from "./automation-builder-search";
import { armPlaybookFirstPaint } from "./playbook-first-paint";

export function AutomationBuilderClientLazy({
  search,
}: {
  search: AutomationBuilderSearch;
}) {
  const needsSession = Boolean(search.id) || search.intent === "apply";
  const [ready, setReady] = useState(needsSession);
  useEffect(() => {
    if (needsSession) return;
    return armPlaybookFirstPaint(() => setReady(true));
  }, [needsSession]);
  if (!ready) return null;
  return <AutomationBuilderClientDynamic search={search} />;
}

const AutomationBuilderClientDynamic = dynamic(
  () =>
    import("./automation-builder-client").then((mod) => ({
      default: mod.AutomationBuilderClient,
    })),
  { ssr: false },
);
