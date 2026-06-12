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

  return (
    <main className="min-h-screen overflow-auto md:ml-72">
      <div className="border-b border-border bg-background/90 backdrop-blur-xl">
        <div
          id="workspace-header-grid"
          className="mx-auto grid max-w-[1280px] gap-4 px-5 py-4 pl-16 sm:px-6 sm:pl-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8 lg:pl-8"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              Workspace
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              {activeItem.label}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {activeItem.description}
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
