"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Compass,
  Copy,
  DollarSign,
  FolderOpen,
  GalleryHorizontal,
  House,
  Images,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  UserRoundPen,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchWorkspaceFeature } from "@/lib/workspace-features-client";
import { readOptionalStorage, writeOptionalStorage } from "@/lib/optional-storage";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { SharedLayoutBg } from "@/components/ui/shared-layout-bg";
import { SidebarMobileNav } from "@/components/sidebar-mobile-nav";
import {
  getActiveWorkspaceItem,
  workspaceNavigationGroups,
  type WorkspaceNavigationItem,
  type WorkspaceNavigationLabel,
} from "@/lib/workspace-navigation";
import { isPublicPolicyPath } from "@/lib/public-policy-routes";

export function Sidebar() {
  const pathname = usePathname();
  const publicPolicyPage = isPublicPolicyPath(pathname);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("PostForge");
  const [notificationPreferences, setNotificationPreferences] = useState({
    failures: false,
    approvals: false,
  });
  const [notificationCounts, setNotificationCounts] = useState<WorkspaceNotificationCounts>({
    generationFailures: 0,
    approvalsWaiting: 0,
  });
  const activeItem = getActiveWorkspaceItem(pathname);
  const quickAction =
    activeItem?.primaryAction ?? workspaceNavigationGroups.primary[0].primaryAction;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const collapsed =
        readOptionalStorage("postforge-sidebar-collapsed") === "true";
      setDesktopCollapsed(collapsed);
      applySidebarCollapsedDataset(collapsed);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (publicPolicyPage) return;
    let cancelled = false;

    async function refreshWorkspaceStatus() {
      try {
        const [{ records }, notificationResponse] = await Promise.all([
          fetchWorkspaceFeature<WorkspaceSidebarSettings>("connections"),
          fetch("/api/workspace-notifications", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        const settings = records.find((record) => record.id === "workspace-settings");
        if (settings?.workspaceName?.trim()) setWorkspaceName(settings.workspaceName.trim());
        setNotificationPreferences({
          failures: settings?.emailFailures === true,
          approvals: settings?.emailApprovals === true,
        });
        if (notificationResponse.ok) {
          const counts = (await notificationResponse.json()) as WorkspaceNotificationCounts;
          if (
            Number.isInteger(counts.generationFailures) &&
            counts.generationFailures >= 0 &&
            Number.isInteger(counts.approvalsWaiting) &&
            counts.approvalsWaiting >= 0
          ) {
            setNotificationCounts(counts);
          }
        }
      } catch {
        return;
      }
    }

    void refreshWorkspaceStatus();
    const interval = window.setInterval(refreshWorkspaceStatus, 60_000);
    window.addEventListener("focus", refreshWorkspaceStatus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWorkspaceStatus);
    };
  }, [publicPolicyPage]);

  if (publicPolicyPage) return null;

  const renderItem = (
    item: WorkspaceNavigationItem,
    mobile = false,
    onClose?: () => void
  ) => {
    const Icon = NAV_ICONS[item.label];
    const active = activeItem?.href === item.href;

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-label={item.label}
        title={item.label}
        aria-current={active ? "page" : undefined}
        onClick={() => mobile && onClose?.()}
        className={cn(
          "sidebar-nav-item t-nav-item group relative flex h-[38px] items-center gap-2.5 rounded-[8px] text-[13px] font-medium transition-colors duration-[var(--pf-duration)] ease-[var(--pf-ease)]",
          mobile ? "justify-start px-2.5" : "justify-center px-0 xl:justify-start xl:px-2.5",
          active
            ? "is-active bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
            : "text-[var(--pf-rail-muted)] hover:text-[var(--pf-rail-ink)]"
        )}
      >
        <Icon
          className={cn(
            "size-[17px] shrink-0 transition-colors duration-[var(--pf-duration)]",
            active ? "text-[var(--pf-orange)]" : "text-[var(--pf-rail-muted)] group-hover:text-[var(--pf-rail-ink)]"
          )}
          strokeWidth={1.8}
        />
        <span className="sidebar-expanded-only min-w-0 flex-1 truncate">{item.label}</span>
      </Link>
    );
  };

  const groupLabel = (label: string, mobile = false) => (
    <span
      className={cn(
        "mb-1 mt-4 block px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-rail-muted)] first:mt-1",
        !mobile && "sidebar-expanded-only"
      )}
    >
      {label}
    </span>
  );

  const navigation = (mobile = false, onClose?: () => void) => (
    <nav className="flex flex-col" aria-label="Workspace navigation">
      {groupLabel("Primary", mobile)}
      <SharedLayoutBg
        className="gap-0.5"
        inset={0}
        pillClassName="rounded-[8px] bg-[var(--pf-active)]"
      >
        {workspaceNavigationGroups.primary.map((item) =>
          renderItem(item, mobile, onClose)
        )}
      </SharedLayoutBg>
      {groupLabel("Tools", mobile)}
      <SharedLayoutBg
        className="gap-0.5"
        inset={0}
        pillClassName="rounded-[8px] bg-[var(--pf-active)]"
      >
        {workspaceNavigationGroups.tools.map((item) =>
          renderItem(item, mobile, onClose)
        )}
      </SharedLayoutBg>
    </nav>
  );

  const footer = (mobile = false, onClose?: () => void) => (
    <div className="mt-auto">
      {(notificationPreferences.failures || notificationPreferences.approvals) && (
        <div className={cn("mb-2 gap-1 rounded-[8px] border border-[var(--pf-rail-border)] bg-[var(--pf-active)] p-1", mobile ? "grid" : "sidebar-expanded-only hidden xl:grid")} aria-label="Workspace notifications">
          {notificationPreferences.failures && notificationCounts.generationFailures > 0 && (
            <Link prefetch={false} href={notificationCounts.latestFailedJobId ? `/generate/${encodeURIComponent(notificationCounts.latestFailedJobId)}` : "/generate"} onClick={() => mobile && onClose?.()} className="flex min-w-0 items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11px] text-[var(--pf-rail-muted)] hover:bg-[var(--pf-surface)] hover:text-[var(--pf-rail-ink)]">
              {/* prefetch-off: alert chip, not primary nav */}
              <Bell className="size-3 shrink-0 text-[var(--pf-danger)]" /><span className="min-w-0 flex-1 truncate">Failed generations</span><b className="pf-data">{notificationCounts.generationFailures}</b>
            </Link>
          )}
          {notificationPreferences.approvals && notificationCounts.approvalsWaiting > 0 && (
            <Link prefetch={false} href="/gallery?reviewStatus=needs_review" onClick={() => mobile && onClose?.()} className="flex min-w-0 items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11px] text-[var(--pf-rail-muted)] hover:bg-[var(--pf-surface)] hover:text-[var(--pf-rail-ink)]">
              {/* prefetch-off: alert chip, not primary nav */}
              <Bell className="size-3 shrink-0 text-[var(--pf-orange)]" /><span className="min-w-0 flex-1 truncate">Outputs to review</span><b className="pf-data">{notificationCounts.approvalsWaiting}</b>
            </Link>
          )}
          {(!notificationPreferences.failures || notificationCounts.generationFailures === 0) &&
            (!notificationPreferences.approvals || notificationCounts.approvalsWaiting === 0) && (
              <span className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-[var(--pf-rail-muted)]"><Bell className="size-3" /> No workflow alerts</span>
            )}
        </div>
      )}
      <div className={cn(
        "mb-2 items-center justify-between px-2 text-[11px] text-[var(--pf-rail-muted)]",
        mobile ? "flex" : "sidebar-expanded-only hidden xl:flex"
      )}>
        <span className="flex items-center gap-1.5">
          <i className="pf-lamp text-[var(--pf-lamp-green)]" />
          Local workspace
        </span>
        <Link prefetch={false} href="/settings?tab=billing" className="font-medium text-[var(--pf-link)] hover:underline">
          {/* prefetch-off: billing is a footer utility */}
          Manage
        </Link>
      </div>
      <SharedLayoutBg
        className="gap-0.5"
        inset={0}
        pillClassName="rounded-[8px] bg-[var(--pf-active)]"
      >
        {workspaceNavigationGroups.utility.map((item) =>
          renderItem(item, mobile, onClose)
        )}
      </SharedLayoutBg>
      <div className={cn(
        "mt-2 grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-2 border-t border-[var(--pf-rail-border)] px-2 pt-3",
        mobile ? "grid" : "sidebar-expanded-only hidden xl:grid"
      )}>
        <span className="grid size-8 place-items-center rounded-[8px] border border-[var(--pf-rail-border)] bg-[var(--pf-active)] text-[11px] font-bold text-[var(--pf-rail-ink)]">
          PF
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-[11px] font-semibold text-[var(--pf-rail-ink)]">{workspaceName}</strong>
          <small className="mt-0.5 block truncate text-[11px] text-[var(--pf-rail-muted)]">Self-hosted</small>
        </span>
        <ThemeToggle />
      </div>
      {!mobile && <div className="sidebar-compact-only mt-2 flex justify-center border-t border-[var(--pf-rail-border)] pt-3 xl:hidden">
          <ThemeToggle />
        </div>}
    </div>
  );

  return (
    <>
      <SidebarMobileNav
        brand={<PostForgeBrand name={workspaceName} />}
        quickAction={quickAction}
      >
        {(close) => (
          <>
            <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
              {navigation(true, close)}
            </div>
            {footer(true, close)}
          </>
        )}
      </SidebarMobileNav>

      <aside id="workspace-sidebar" className="fixed inset-y-0 left-0 z-40 hidden w-[72px] border-r border-[var(--pf-rail-border)] bg-[var(--pf-rail)] md:flex xl:w-64">
        <div className="sidebar-frame flex w-full flex-col px-2 py-5 xl:px-4">
          <div className="sidebar-header flex min-w-0 items-center justify-between gap-1">
            <PostForgeBrand name={workspaceName} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                const nextCollapsed = !desktopCollapsed;
                setDesktopCollapsed(nextCollapsed);
                writeOptionalStorage("postforge-sidebar-collapsed", String(nextCollapsed));
                applySidebarCollapsedDataset(nextCollapsed);
              }}
              aria-label={desktopCollapsed ? "Expand workspace sidebar" : "Collapse workspace sidebar"}
              aria-expanded={!desktopCollapsed}
              title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden size-7 shrink-0 rounded-[6px] text-[var(--pf-rail-muted)] hover:bg-[var(--pf-active)] hover:text-[var(--pf-rail-ink)] xl:inline-flex"
            >
              {desktopCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          </div>
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-0.5">{navigation()}</div>
          {footer()}
        </div>
      </aside>
    </>
  );
}


const NAV_ICONS: Record<WorkspaceNavigationLabel, LucideIcon> = {
  Home: House,
  Jobs: ListChecks,
  Inspiration: Compass,
  Clone: Copy,
  Slideshow: GalleryHorizontal,
  Gallery: Images,
  Automations: Workflow,
  Performance: BarChart3,
  Spend: DollarSign,
  Generate: Sparkles,
  Collections: FolderOpen,
  Characters: UserRoundPen,
  Settings,
};

type WorkspaceSidebarSettings = {
  id: string;
  workspaceName?: string;
  emailFailures?: boolean;
  emailApprovals?: boolean;
};

type WorkspaceNotificationCounts = {
  generationFailures: number;
  approvalsWaiting: number;
  latestFailedJobId?: string | null;
};

function applySidebarCollapsedDataset(collapsed: boolean) {
  if (collapsed) {
    document.documentElement.dataset.sidebarCollapsed = "true";
  } else {
    delete document.documentElement.dataset.sidebarCollapsed;
  }
}

function PostForgeBrand({ name }: { name: string }) {
  return (
    <Link href="/" className="sidebar-brand flex min-w-0 items-center gap-2.5 px-2" aria-label={name}>
      <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-[7px] bg-[var(--pf-orange)] text-xs font-bold text-white shadow-[var(--pf-shadow-orange)]">
        P
      </span>
      <span className="sidebar-expanded-only min-w-0 truncate text-[15px] font-bold tracking-[-0.02em] text-[var(--pf-rail-ink)]">{name}</span>
    </Link>
  );
}