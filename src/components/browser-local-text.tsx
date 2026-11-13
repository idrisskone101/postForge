"use client";

import type { ReactNode } from "react";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Text that depends on the browser's clock or time zone inside server-rendered
 * markup. The server's text paints first; after hydration the span remounts
 * with the browser's text, so a different time zone never breaks hydration.
 */
export function BrowserLocalText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const hydrated = useHydrated();
  return (
    <span key={hydrated ? "browser" : "server"} suppressHydrationWarning className={className}>
      {children}
    </span>
  );
}
