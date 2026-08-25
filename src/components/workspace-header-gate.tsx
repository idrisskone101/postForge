"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  routeOwnsHeader,
  routeProvidesHeaderAccessory,
} from "@/lib/workspace-header-route";
import {
  getActiveWorkspaceItem,
  workspaceNavigationGroups,
  type WorkspaceNavigationItem,
} from "@/lib/workspace-navigation";

export function WorkspaceHeaderGate({
  serverPathname,
}: {
  serverPathname: string;
}) {
  const pathname = usePathname() || serverPathname;
  if (routeOwnsHeader(pathname)) return null;
  const activeItem =
    getActiveWorkspaceItem(pathname) ?? workspaceNavigationGroups.primary[0];
  return (
    <WorkspaceRouteHeader
      activeItem={activeItem}
      hasAccessory={routeProvidesHeaderAccessory(pathname)}
    />
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
    <div
      id="workspace-header"
      className="border-b border-[var(--pf-border)] bg-[var(--pf-canvas)]"
    >
      <div
        id="workspace-header-grid"
        data-header-accessory={hasAccessory ? "true" : "false"}
        className={cn(
          "grid min-h-[120px] gap-4 px-5 pb-6 pt-6 sm:px-7 lg:items-end lg:px-8 lg:grid-cols-[minmax(0,1fr)_auto]"
        )}
      >
        <div className="min-w-0">
          <h1 data-workspace-title={activeItem.label}>
            <span className="sr-only">{activeItem.label}</span>
          </h1>
          <p data-header-copy={activeItem.description}>
            <span className="sr-only">{activeItem.description}</span>
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
              data-header-action={activeItem.primaryAction.label}
              className="pf-button-primary w-fit"
            >
              <span className="sr-only">{activeItem.primaryAction.label}</span>
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
