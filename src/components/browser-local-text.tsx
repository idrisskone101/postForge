"use client";

import type { ReactNode } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

/**
 * Text that depends on the browser's clock or time zone inside server-rendered
 * markup. The server's text is laid out but not painted, so it reserves the
 * width; after hydration the span remounts with the browser's text. A reader in
 * another time zone never sees the server's time first, and hydration never breaks.
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
    <span
      key={hydrated ? "browser" : "server"}
      suppressHydrationWarning
      className={cn(className, !hydrated && "invisible")}
    >
      {children}
    </span>
  );
}
