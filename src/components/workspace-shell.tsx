"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight } from "lucide-react";
import {
  getActiveWorkspaceItem,
  workspaceNavigationGroups,
} from "@/lib/workspace-navigation";

export function WorkspaceHeaderAccessory({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setTarget(document.getElementById("workspace-header-accessory"));
    });
    document.body.dataset.workspaceHeaderAccessory = "true";

    return () => {
      window.cancelAnimationFrame(frameId);
      setTarget(null);
      delete document.body.dataset.workspaceHeaderAccessory;
    };
  }, []);

  return target ? createPortal(children, target) : null;
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeItem =
    getActiveWorkspaceItem(pathname) ?? workspaceNavigationGroups.primary[0];
  const isClone = activeItem.label === "Clone";

  return (
    <main className="flex min-h-screen flex-col overflow-hidden md:ml-[248px]">
      <div className="h-[76px] shrink-0 border-b border-white/10 bg-[oklch(0.145_0_0)]">
        <div
          id="workspace-header-grid"
          className="grid h-full gap-4 px-5 py-4 pl-16 sm:px-6 sm:pl-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8 lg:pl-8"
        >
          <div className="min-w-0">
            <h1 className="text-xl font-semibold leading-tight tracking-tight">
              {isClone ? "Clone Workspace" : activeItem.label}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-white/50">
              {isClone ? "Production #1024 • Guided Synthesis" : activeItem.description}
            </p>
          </div>

          <div className="min-w-0 lg:justify-self-end">
            <div id="workspace-header-accessory" />
            <Link
              id="workspace-header-default-action"
              href={activeItem.primaryAction.href}
              className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-accent-coral px-4 text-sm font-semibold text-white transition-colors hover:bg-[#ff6540]"
            >
              {activeItem.primaryAction.label}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      {children}
    </main>
  );
}
