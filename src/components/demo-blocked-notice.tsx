"use client";

import { useCallback, useEffect, useState } from "react";
import { Toast, type ToastMessage } from "@/components/workbench/toast";
import { DEMO_BLOCKED_HEADER } from "@/lib/demo/mode";

/**
 * Demo builds only. Routes report a refused request in their own way (or not at all), so this
 * watches every response and says once, in one place, why the action did nothing.
 */
export function DemoBlockedNotice() {
  const [notice, setNotice] = useState<ToastMessage | null>(null);

  useEffect(
    () =>
      observeRefusedRequests((kind) =>
        setNotice({ id: `${kind}-${Date.now()}`, tone: "warn", message: NOTICE_COPY[kind] })
      ),
    []
  );

  const dismiss = useCallback(
    (id: string) => setNotice((current) => (current?.id === id ? null : current)),
    []
  );

  if (notice === null) return null;
  return (
    <div className="wb-toast-region" data-demo-notice="true">
      <Toast key={notice.id} toast={notice} onDismiss={dismiss} />
    </div>
  );
}

type DemoRefusal = "blocked" | "limited";

const NOTICE_COPY: Record<DemoRefusal, string> = {
  blocked:
    "Turned off in the demo. Generation, uploads and external connections are disabled, but you can still browse and edit the sample content.",
  limited: "The demo limits how fast its sample content can change. Try again in a minute.",
};

function observeRefusedRequests(onRefused: (kind: DemoRefusal) => void) {
  const original = window.fetch;
  const observed: typeof window.fetch = async (...args) => {
    const response = await original.apply(window, args);
    const refusal = response.headers.get(DEMO_BLOCKED_HEADER);
    if (refusal === "blocked" || refusal === "limited") onRefused(refusal);
    return response;
  };
  window.fetch = observed;
  return () => {
    if (window.fetch === observed) window.fetch = original;
  };
}
