"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SidebarNav, SidebarNavItem } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Icon } from "@/components/workbench/icon";
import { readOptionalStorage, writeOptionalStorage } from "@/lib/optional-storage";
import { isPublicPolicyPath } from "@/lib/public-policy-routes";
import { useWorkspaceNotifications } from "@/lib/use-workspace-notifications";
import {
  getActiveWorkspaceItem,
  workspaceNavigationGroups,
} from "@/lib/workspace-navigation";

export function Sidebar() {
  const pathname = usePathname();
  const publicPolicyPage = isPublicPolicyPath(pathname);
  const mobileNavRef = useRef<HTMLDialogElement>(null);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const counts = useWorkspaceNotifications(!publicPolicyPage);
  const activeItem = getActiveWorkspaceItem(pathname);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const collapsed = readOptionalStorage(COLLAPSED_STORAGE_KEY) === "true";
      setDesktopCollapsed(collapsed);
      applySidebarCollapsedDataset(collapsed);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (publicPolicyPage) return null;

  const closeMobileNav = () => mobileNavRef.current?.close();
  const toggleCollapsed = () => {
    const nextCollapsed = !desktopCollapsed;
    setDesktopCollapsed(nextCollapsed);
    writeOptionalStorage(COLLAPSED_STORAGE_KEY, String(nextCollapsed));
    applySidebarCollapsedDataset(nextCollapsed);
  };

  const settingsActive = activeItem?.href === SETTINGS_ITEM.href;

  return (
    <>
      <div id="workspace-mobile-bar">
        <button
          type="button"
          aria-label="Open workspace navigation"
          className="wb-icon-btn wb-icon-btn-ghost wb-icon-btn-40"
          onClick={() => mobileNavRef.current?.showModal()}
        >
          <Icon name="menu" />
        </button>
        <dialog
          ref={mobileNavRef}
          id="workspace-mobile-drawer"
          aria-label="Workspace navigation"
          className="sidebar-mobile-drawer"
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}
        >
          <div className="sidebar-mobile-frame">
            <div className="sidebar-top">
              <div className="sidebar-header">
                <PostForgeBrand onNavigate={closeMobileNav} />
                <button
                  type="button"
                  aria-label="Close workspace navigation"
                  className="wb-icon-btn wb-icon-btn-ghost wb-icon-btn-28"
                  onClick={closeMobileNav}
                >
                  <Icon name="x" />
                </button>
              </div>
              <SidebarNav
                activeHref={activeItem?.href}
                counts={counts}
                onNavigate={closeMobileNav}
              />
            </div>
            <SidebarFoot active={settingsActive} onNavigate={closeMobileNav} />
          </div>
        </dialog>
        <PostForgeBrand />
      </div>

      <aside id="workspace-sidebar">
        <div className="sidebar-top">
          <div className="sidebar-header">
            <PostForgeBrand />
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={
                desktopCollapsed ? "Expand workspace sidebar" : "Collapse workspace sidebar"
              }
              aria-expanded={!desktopCollapsed}
              title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="wb-icon-btn wb-icon-btn-ghost wb-icon-btn-28 max-xl:hidden"
            >
              <Icon name="sidebar" />
            </button>
          </div>
          <SidebarNav activeHref={activeItem?.href} counts={counts} />
        </div>
        <SidebarFoot active={settingsActive} />
      </aside>
    </>
  );
}

const SETTINGS_ITEM = workspaceNavigationGroups.utility[0];
const COLLAPSED_STORAGE_KEY = "postforge-sidebar-collapsed";

function SidebarFoot({ active, onNavigate }: { active: boolean; onNavigate?: () => void }) {
  return (
    <div className="sidebar-foot">
      <SidebarNavItem item={SETTINGS_ITEM} active={active} onNavigate={onNavigate} />
      <ThemeToggle className="sidebar-foot-toggle" />
    </div>
  );
}

function applySidebarCollapsedDataset(collapsed: boolean) {
  if (collapsed) {
    document.documentElement.dataset.sidebarCollapsed = "true";
  } else {
    delete document.documentElement.dataset.sidebarCollapsed;
  }
}

function PostForgeBrand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" className="sidebar-brand" aria-label="PostForge" onClick={onNavigate}>
      <span aria-hidden="true" className="sidebar-brand-tile">
        <Icon name="logo" strokeWidth={2} />
      </span>
      <span className="sidebar-expanded-only sidebar-brand-name">PostForge</span>
    </Link>
  );
}
