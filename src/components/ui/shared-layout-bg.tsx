"use client";
// beui.dev/components/motion/shared-layout-bg

import dynamic from "next/dynamic";
import { useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SharedLayoutBgProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  children: ReactNode;
  /** Semantic container used for the children. */
  as?: "div" | "ul";
  /** Tailwind class applied to the moving pill. Defaults to a subtle foreground tint. */
  pillClassName?: string;
  /** Horizontal inset of the pill relative to each row (px). Default 20. */
  inset?: number;
  /** Optional positioning override for the pill wrapper inside each item. */
  pillContainerClassName?: string;
}

export function SharedLayoutBg(props: SharedLayoutBgProps) {
  const [enhance, setEnhance] = useState(false);
  if (!enhance) {
    return (
      <StaticSharedLayoutBg
        {...props}
        onMouseEnter={(event) => {
          props.onMouseEnter?.(event);
          setEnhance(true);
        }}
      />
    );
  }
  return <SharedLayoutBgMotion {...props} />;
}

function StaticSharedLayoutBg({
  children,
  as = "div",
  className,
  onMouseEnter,
  onMouseLeave,
}: SharedLayoutBgProps) {
  const Tag = as === "ul" ? "ul" : "div";
  return (
    <Tag
      className={cn("flex w-full flex-col", className)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </Tag>
  );
}

const SharedLayoutBgMotion = dynamic(
  () =>
    import("./shared-layout-bg-motion").then((mod) => ({
      default: mod.SharedLayoutBg,
    })),
  { ssr: false },
);
