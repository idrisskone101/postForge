"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function WorkspaceHeaderAccessory({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setTarget(document.getElementById("workspace-header-accessory"));
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      setTarget(null);
    };
  }, []);

  return target ? createPortal(children, target) : null;
}
