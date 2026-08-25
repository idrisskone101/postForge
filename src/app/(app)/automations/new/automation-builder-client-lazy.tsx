"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { AutomationBuilderSearch } from "./automation-builder-search";

export function AutomationBuilderClientLazy({
  search,
}: {
  search: AutomationBuilderSearch;
}) {
  const needsSession = Boolean(search.id) || search.intent === "apply";
  const [ready, setReady] = useState(needsSession);
  useEffect(() => {
    if (needsSession) return;
    const go = () => setReady(true);
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
    return () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
    };
  }, [needsSession]);
  useEffect(() => {
    if (!ready) return;
    document.querySelector("[data-playbook-first-paint]")?.setAttribute("hidden", "");
  }, [ready]);
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
