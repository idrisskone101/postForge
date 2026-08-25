"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { AutomationBuilderSearch } from "./automation-builder-search";

const AutomationBuilderClientDynamic = dynamic(
  () =>
    import("./automation-builder-client").then((mod) => ({
      default: mod.AutomationBuilderClient,
    })),
  { ssr: false },
);

export function AutomationBuilderClientLazy({
  search,
}: {
  search: AutomationBuilderSearch;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (document.readyState === "complete") {
      setReady(true);
      return;
    }
    const onLoad = () => setReady(true);
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.querySelector("[data-playbook-first-paint]")?.setAttribute("hidden", "");
  }, [ready]);
  if (!ready) return null;
  return <AutomationBuilderClientDynamic search={search} />;
}
