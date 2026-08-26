"use client";

import type { CSSProperties, ReactNode } from "react";

type LiveTag = "b" | "h1" | "h2" | "h3" | "p" | "span" | "strong";

export function GeneratePaintText({
  ready,
  paint,
  liveAs = "span",
  liveClassName,
  children,
}: {
  ready: boolean;
  paint: ReactNode;
  liveAs?: LiveTag;
  liveClassName: string;
  children: ReactNode;
}) {
  const Live = liveAs;
  return (
    <>
      <div aria-hidden={ready || undefined} style={ready ? PAINT_HIDDEN_SHELL : undefined}>
        {paint}
      </div>
      {ready ? <Live className={liveClassName}>{children}</Live> : null}
    </>
  );
}

export const PAINT_HIDDEN_SHELL: CSSProperties = {
  position: "absolute",
  width: 0,
  height: 0,
  overflow: "hidden",
  clipPath: "inset(50%)",
};
