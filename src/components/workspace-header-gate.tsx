"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClass } from "@/components/workbench/button";
import { Icon } from "@/components/workbench/icon";
import { PageHeader, type PageHeaderStack } from "@/components/workbench/page-header";
import {
  routeHeaderStackBelow,
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
    getActiveWorkspaceItem(pathname) ?? workspaceNavigationGroups.overview[0];
  return (
    <WorkspaceRouteHeader
      activeItem={activeItem}
      hasAccessory={routeProvidesHeaderAccessory(pathname)}
      stackBelow={routeHeaderStackBelow(pathname)}
    />
  );
}

/**
 * Shared page header: the title only. Routes that pass controls through
 * WorkspaceHeaderAccessory own the actions slot; otherwise the slot holds the
 * route's one primary action when the design gives it one.
 */
export function WorkspaceRouteHeader({
  activeItem,
  hasAccessory = false,
  stackBelow,
}: {
  activeItem: WorkspaceNavigationItem;
  hasAccessory?: boolean;
  stackBelow?: PageHeaderStack;
}) {
  const primaryAction = hasAccessory ? undefined : activeItem.primaryAction;
  return (
    <PageHeader id="workspace-header" title={activeItem.label} stackBelow={stackBelow}>
      <div id="workspace-header-accessory" />
      {primaryAction && (
        <Link
          id="workspace-header-default-action"
          href={primaryAction.href}
          className={buttonClass("primary", 40)}
        >
          <Icon name={primaryAction.icon} strokeWidth={2} />
          {primaryAction.label}
        </Link>
      )}
    </PageHeader>
  );
}
