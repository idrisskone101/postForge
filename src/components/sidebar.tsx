"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { SidebarNav, SidebarNavItem } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Icon } from "@/components/workbench/icon";
import { StatusChip } from "@/components/workbench/status-chip";
import { demoResetIntervalMinutes, isDemoMode } from "@/lib/demo/mode";
import { lockPageScroll } from "@/lib/page-scroll-lock";
import { readOptionalStorage, writeOptionalStorage } from "@/lib/optional-storage";
import { isPublicPolicyPath } from "@/lib/public-policy-routes";
import { useWorkspaceNotifications } from "@/lib/use-workspace-notifications";
import {
  getActiveWorkspaceItem,
  workspaceNavigationGroups,
} from "@/lib/workspace-navigation";

export function Sidebar({ initialWorkspaceName }: { initialWorkspaceName?: string }) {
  const pathname = usePathname();
  const publicPolicyPage = isPublicPolicyPath(pathname);
  const mobileNavRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closedByPointer = useRef(false);
  const unlockPage = useRef<(() => void) | null>(null);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const { counts, workspaceName } = useWorkspaceNotifications(
    !publicPolicyPage,
    initialWorkspaceName
  );
  const activeItem = getActiveWorkspaceItem(pathname);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const collapsed = readOptionalStorage(COLLAPSED_STORAGE_KEY) === "true";
      setDesktopCollapsed(collapsed);
      applySidebarCollapsedDataset(collapsed);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => closeDrawerAtDesktopWidth(mobileNavRef), []);

  if (publicPolicyPage) return null;

  // The drawer leaves through [data-closing] and is closed once that transition ends, because
  // Safari drops a closed dialog at once and would skip the exit.
  const closeMobileNav = () => {
    const drawer = mobileNavRef.current;
    if (!drawer?.open || drawer.dataset.closing) return;
    drawer.dataset.closing = "true";
    void Promise.allSettled(drawer.getAnimations().map((animation) => animation.finished)).then(() => {
      delete drawer.dataset.closing;
      // Closing hands focus back to the menu button, and Safari rings it whatever closed the
      // drawer. After a pointer close the button stays quiet until focus leaves it.
      const menuButton = menuButtonRef.current;
      if (closedByPointer.current && menuButton) {
        menuButton.dataset.quietFocus = "true";
        menuButton.addEventListener("blur", () => delete menuButton.dataset.quietFocus, { once: true });
      }
      drawer.close();
    });
  };
  const toggleCollapsed = () => {
    const nextCollapsed = !desktopCollapsed;
    setDesktopCollapsed(nextCollapsed);
    writeOptionalStorage(COLLAPSED_STORAGE_KEY, String(nextCollapsed));
    applySidebarCollapsedDataset(nextCollapsed);
    playSidebarSwap();
  };

  const settingsActive = activeItem?.href === SETTINGS_ITEM.href;

  return (
    <>
      <div id="workspace-mobile-bar">
        <PostForgeBrand name={workspaceName} />
        {DEMO && <DemoBadge className="mr-auto" />}
        <button
          type="button"
          ref={menuButtonRef}
          aria-label="Open workspace navigation"
          className="wb-icon-btn wb-icon-btn-ghost wb-icon-btn-40"
          onClick={(event) => {
            unlockPage.current ??= lockPageScroll();
            mobileNavRef.current?.showModal();
            // showModal focuses the brand link, and Safari rings it even for a tap. A keyboard
            // click has no detail and keeps that focus; a pointer open parks focus on the drawer.
            if (event.detail > 0) mobileNavRef.current?.focus();
          }}
        >
          <Icon name="menu" />
        </button>
        <dialog
          ref={mobileNavRef}
          id="workspace-mobile-drawer"
          aria-label="Workspace navigation"
          tabIndex={-1}
          className="sidebar-mobile-drawer"
          onPointerDown={() => {
            closedByPointer.current = true;
          }}
          onKeyDown={(event) => {
            closedByPointer.current = false;
            wrapTabInDrawer(event);
          }}
          onCancel={(event) => {
            event.preventDefault();
            closeMobileNav();
          }}
          onClose={() => {
            unlockPage.current?.();
            unlockPage.current = null;
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeMobileNav();
          }}
        >
          <div className="sidebar-mobile-frame">
            <div className="sidebar-top">
              <div className="sidebar-header">
                <PostForgeBrand name={workspaceName} onNavigate={closeMobileNav} />
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
                className="wb-scroll-fade-y wb-scroll-fade-deep"
              />
            </div>
            <SidebarFoot active={settingsActive} onNavigate={closeMobileNav} />
          </div>
        </dialog>
      </div>

      <aside id="workspace-sidebar">
        <div className="sidebar-top">
          <div className="sidebar-header">
            <PostForgeBrand name={workspaceName} />
            {DEMO && <DemoBadge className="sidebar-expanded-only" />}
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

const DEMO = isDemoMode();

/** Demo builds only: says the workspace is sample data that restores itself. */
function DemoBadge({ className }: { className?: string }) {
  const minutes = demoResetIntervalMinutes();
  const cadence = minutes === 60 ? "every hour" : `every ${minutes} minutes`;
  return (
    <span title={`Sample data. The demo restores itself ${cadence}.`} className={className}>
      <StatusChip>Demo</StatusChip>
    </span>
  );
}

function SidebarFoot({ active, onNavigate }: { active: boolean; onNavigate?: () => void }) {
  return (
    <div className="sidebar-foot">
      <SidebarNavItem item={SETTINGS_ITEM} active={active} onNavigate={onNavigate} />
      <span className="sidebar-foot-toggle">
        <ThemeToggle />
      </span>
    </div>
  );
}

/**
 * A modal dialog keeps Tab out of the page behind it, but past its last control the browser takes
 * focus to its own toolbar. The drawer wraps instead, both ways.
 */
function wrapTabInDrawer(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const drawer = event.currentTarget;
  const stops = [...drawer.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)")];
  const edge = event.shiftKey ? stops[0] : stops[stops.length - 1];
  const active = document.activeElement;
  if (active !== edge && !(event.shiftKey && active === drawer)) return;
  event.preventDefault();
  (event.shiftKey ? stops[stops.length - 1] : stops[0])?.focus();
}

/** A modal drawer left open while the mobile bar disappears would make the page inert. */
function closeDrawerAtDesktopWidth(drawer: RefObject<HTMLDialogElement | null>) {
  const desktop = window.matchMedia("(min-width: 768px)");
  const close = () => drawer.current?.close();
  desktop.addEventListener("change", close);
  return () => desktop.removeEventListener("change", close);
}

function applySidebarCollapsedDataset(collapsed: boolean) {
  if (collapsed) {
    document.documentElement.dataset.sidebarCollapsed = "true";
  } else {
    delete document.documentElement.dataset.sidebarCollapsed;
  }
}

/** The width changes in one step; the sidebar contents cross-fade for 200ms (see shell.css). */
function playSidebarSwap() {
  const root = document.documentElement;
  root.dataset.sidebarAnimating = "true";
  window.setTimeout(() => delete root.dataset.sidebarAnimating, SIDEBAR_SWAP_MS);
}

const SIDEBAR_SWAP_MS = 220;

function PostForgeBrand({ name, onNavigate }: { name: string; onNavigate?: () => void }) {
  return (
    <Link href="/" className="wb-hit sidebar-brand" aria-label={name} onClick={onNavigate}>
      <span aria-hidden="true" className="sidebar-brand-tile">
        <Icon name="logo" strokeWidth={2} />
      </span>
      <span className="sidebar-expanded-only sidebar-brand-name">{name}</span>
    </Link>
  );
}
