"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { CountBadge } from "@/components/workbench/count-badge";
import { Icon, type IconName } from "@/components/workbench/icon";
import {
  getSidebarPillOffset,
  workspaceSidebarGroups,
  type WorkspaceNavigationItem,
  type WorkspaceNavigationLabel,
} from "@/lib/workspace-navigation";
import type { WorkspaceNotificationCounts } from "@/lib/use-workspace-notifications";

type SidebarNavProps = {
  activeHref: string | undefined;
  counts: WorkspaceNotificationCounts;
  onNavigate?: () => void;
  className?: string;
};

/** Four unlabelled groups. The raised pill slides to the active item in 200ms. */
export function SidebarNav({ activeHref, counts, onNavigate, className }: SidebarNavProps) {
  const pillOffset = getSidebarPillOffset(activeHref);
  const pillStyle: CSSProperties & Record<"--sidebar-pill-y", string> = {
    "--sidebar-pill-y": `${pillOffset ?? 0}px`,
  };

  return (
    <nav className={cn("sidebar-nav", className)} aria-label="Workspace navigation">
      <span
        aria-hidden="true"
        className="sidebar-nav-pill"
        data-visible={pillOffset === null ? "false" : "true"}
        style={pillStyle}
      />
      {workspaceSidebarGroups.map((group) => (
        <div key={group[0].href} className="sidebar-nav-group">
          {group.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              active={item.href === activeHref}
              onNavigate={onNavigate}
              status={navItemStatus(item.label, counts)}
            >
              {item.label === "Jobs" && (
                <CountBadge
                  count={counts.generationFailures}
                  tone="bad"
                  className="sidebar-expanded-only"
                />
              )}
              {item.label === "Gallery" && (
                <CountBadge count={counts.approvalsWaiting} className="sidebar-expanded-only" />
              )}
            </SidebarNavItem>
          ))}
        </div>
      ))}
    </nav>
  );
}

type SidebarNavItemProps = {
  item: WorkspaceNavigationItem;
  active: boolean;
  onNavigate?: () => void;
  /** Spoken after the label, e.g. "3 failed". The link name overrides its content. */
  status?: string;
  children?: React.ReactNode;
};

export function SidebarNavItem({
  item,
  active,
  onNavigate,
  status,
  children,
}: SidebarNavItemProps) {
  return (
    <Link
      href={item.href}
      aria-label={status ? `${item.label}, ${status}` : item.label}
      title={item.label}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className="sidebar-nav-item"
    >
      <Icon name={NAV_ICONS[item.label]} className="sidebar-nav-icon" />
      <span className="sidebar-expanded-only sidebar-nav-label">{item.label}</span>
      {children}
    </Link>
  );
}

function navItemStatus(label: WorkspaceNavigationLabel, counts: WorkspaceNotificationCounts) {
  if (label === "Jobs" && counts.generationFailures > 0) {
    return `${counts.generationFailures} failed`;
  }
  if (label === "Gallery" && counts.approvalsWaiting > 0) {
    return `${counts.approvalsWaiting} to review`;
  }
  return undefined;
}

const NAV_ICONS: Record<WorkspaceNavigationLabel, IconName> = {
  Home: "home",
  Jobs: "jobs",
  Inspiration: "inspiration",
  Clone: "clone",
  Slideshow: "slideshow",
  Generate: "generate",
  Gallery: "gallery",
  Collections: "collections",
  Characters: "characters",
  Automations: "automations",
  Performance: "performance",
  Spend: "spend",
  Settings: "settings",
};
