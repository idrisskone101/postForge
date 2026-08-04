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
    <div className="border-b border-[#DEDFD8] bg-[#F3F4EF]">
      <div
        id="workspace-header-grid"
        className={cn(
          "grid min-h-[104px] gap-4 px-5 py-5 sm:px-7 lg:items-center lg:px-8",
          hasAccessory
            ? "lg:grid-cols-[minmax(220px,360px)_minmax(0,1fr)]"
            : "lg:grid-cols-[minmax(0,1fr)_auto]"
        )}
      >
        <div className="min-w-0">
          <p className="pf-eyebrow">{activeItem.eyebrow}</p>
          <h1 className="mt-1 text-[27px] font-semibold leading-none tracking-[-0.04em] text-[#232323] sm:text-[29px]">
            {activeItem.label}
          </h1>
          <p className="mt-1.5 max-w-2xl text-[11px] leading-[1.125rem] text-[#777873]">
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
  const activeItem =
    getActiveWorkspaceItem(pathname) ?? workspaceNavigationGroups.primary[0];
  const hideHeader = routeOwnsHeader(pathname);
  const hasHeaderAccessory = routeProvidesHeaderAccessory(pathname);

  return (
    <main
      id="workspace-shell"
      className="min-h-dvh min-w-0 overflow-x-hidden bg-[#F3F4EF] pt-[calc(58px+env(safe-area-inset-top))] md:ml-[72px] md:pt-0 xl:ml-64"
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
