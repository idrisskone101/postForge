"use client";
// beui.dev/components/motion/drawer

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right";
  children: ReactNode;
  /** Class for the panel surface. */
  className?: string;
  /** Class for the backdrop. */
  backdropClassName?: string;
  ariaLabel?: string;
  /** Close when the backdrop is clicked. Default true. */
  dismissable?: boolean;
  id?: string;
}

export function Drawer(props: DrawerProps) {
  const [seenOpen, setSeenOpen] = useState(false);
  if (props.open && !seenOpen) {
    setSeenOpen(true);
  }
  if (!(seenOpen || props.open)) return null;
  return <DrawerMotion {...props} />;
}

const DrawerMotion = dynamic(
  () =>
    import("./drawer-motion").then((mod) => ({
      default: mod.Drawer,
    })),
  { ssr: false },
);
