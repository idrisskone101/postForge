"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getActiveWorkspaceItem,
  workspaceNavigationGroups,
  type WorkspaceNavigationItem,
} from "@/lib/workspace-navigation";
import { isPublicPolicyPath } from "@/lib/public-policy-routes";

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

function routeOwnsHeader(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/ugc-clone" ||
    /^\/ugc-clone\/[^/]+$/.test(pathname) ||
    /^\/generate\/[^/]+$/.test(pathname) ||
    pathname === "/automations/new" ||
    pathname === "/characters/new"
  );
}

function routeProvidesHeaderAccessory(pathname: string) {
  return (
    pathname === "/ugc-inspiration" ||
    pathname === "/gallery" ||
    pathname === "/generate" ||
    pathname === "/slideshow"
  );
}

export function WorkspaceRouteHeader({
  activeItem,
  hasAccessory = false,
}: {
  activeItem: WorkspaceNavigationItem;
  hasAccessory?: boolean;
}) {
  return (
    <div className="border-b border-[var(--pf-border)] bg-[var(--pf-canvas)]">
      <div
        id="workspace-header-grid"
        className={cn(
          "grid min-h-[120px] gap-4 px-5 pb-6 pt-6 sm:px-7 lg:items-end lg:px-8 lg:grid-cols-[minmax(0,1fr)_auto]"
        )}
      >
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--pf-ink)] sm:text-[30px]">
            {activeItem.label}
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-[var(--pf-muted)]">
            {activeItem.description}
          </p>
        </div>

        <div
          className={cn(
            "min-w-0 lg:justify-self-end",
            hasAccessory && "min-h-9"
          )}
        >
          <div id="workspace-header-accessory" />
          {!hasAccessory && (
            <Link
              id="workspace-header-default-action"
              href={activeItem.primaryAction.href}
              className="pf-button-primary w-fit"
            >
              {activeItem.primaryAction.label}
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isPublicPolicyPath(pathname)) {
    return (
      <div id="workspace-shell" className="min-h-dvh min-w-0 bg-[var(--pf-canvas)]">
        {children}
      </div>
    );
  }

  const activeItem =
    getActiveWorkspaceItem(pathname) ?? workspaceNavigationGroups.primary[0];
  const hideHeader = routeOwnsHeader(pathname);
  const hasHeaderAccessory = routeProvidesHeaderAccessory(pathname);

  return (
    <main
      id="workspace-shell"
      className="min-h-dvh min-w-0 overflow-x-hidden bg-[var(--pf-canvas)] pt-[calc(58px+env(safe-area-inset-top))] md:ml-[72px] md:pt-0 xl:ml-64"
    >
      {!hideHeader && (
        <WorkspaceRouteHeader
          activeItem={activeItem}
          hasAccessory={hasHeaderAccessory}
        />
      )}

      {children}
    </main>
  );
}
