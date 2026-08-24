"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function JobsAutoRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => router.refresh(), 5_000);
    const refreshOnFocus = () => router.refresh();
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [enabled, router]);

  return null;
}
