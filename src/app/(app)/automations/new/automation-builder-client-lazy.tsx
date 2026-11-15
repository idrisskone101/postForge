"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AutomationBuilderLoading } from "./automation-builder-loading";
import type { AutomationBuilderSearch } from "./automation-builder-search";
import { armPlaybookFirstPaint, lockPlaybookFirstPaint } from "./playbook-first-paint";

export function AutomationBuilderClientLazy({
  search,
}: {
  search: AutomationBuilderSearch;
}) {
  const needsSession = Boolean(search.id) || search.intent === "apply";
  const [ready, setReady] = useState(needsSession);
  useLayoutEffect(() => {
    if (needsSession) return;
    return lockPlaybookFirstPaint();
  }, [needsSession]);
  useEffect(() => {
    if (needsSession) return;
    return armPlaybookFirstPaint(() => setReady(true));
  }, [needsSession]);
  if (!ready) return null;
  return needsSession ? <BuilderSessionEntry search={search} /> : <BuilderPickerEntry search={search} />;
}

const loadBuilderClient = () =>
  import("./automation-builder-client").then((mod) => ({
    default: mod.AutomationBuilderClient,
  }));

/** The server has already drawn the picker over a skeleton, so nothing stands in while this loads. */
const BuilderPickerEntry = dynamic(loadBuilderClient, { ssr: false });

/** An edit or an applied playbook has no server copy: the skeleton and heading are the first paint. */
const BuilderSessionEntry = dynamic(loadBuilderClient, {
  ssr: false,
  loading: AutomationBuilderLoading,
});
