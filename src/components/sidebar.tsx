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
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Sparkles,
  UserRoundPen,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchWorkspaceFeature } from "@/lib/workspace-features-client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [desktopPreferenceReady, setDesktopPreferenceReady] = useState(false);
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
    try {
      setDesktopCollapsed(
        window.localStorage.getItem("postforge-sidebar-collapsed") === "true"
      );
    } catch {
      setDesktopCollapsed(false);
    } finally {
      setDesktopPreferenceReady(true);
    }
  }, []);

  useEffect(() => {
    if (!desktopPreferenceReady) return;

    try {
      window.localStorage.setItem(
        "postforge-sidebar-collapsed",
        String(desktopCollapsed)
      );
    } catch {
      // The responsive rail still works when storage is unavailable.
    }
    if (desktopCollapsed) {
      document.documentElement.dataset.sidebarCollapsed = "true";
    } else {
      delete document.documentElement.dataset.sidebarCollapsed;
    }

  }, [desktopCollapsed, desktopPreferenceReady]);

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
        // Navigation remains available if optional workspace status is offline.
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

  const renderItem = (item: WorkspaceNavigationItem, mobile = false) => {
    const Icon = NAV_ICONS[item.label];
    const active = activeItem?.href === item.href;

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-label={item.label}
        title={item.label}
        aria-current={active ? "page" : undefined}
        onClick={() => mobile && setMobileOpen(false)}
        className={cn(
          "sidebar-nav-item group relative flex h-[38px] items-center gap-2.5 rounded-[8px] text-[13px] font-medium transition-colors duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          mobile ? "justify-start px-2.5" : "justify-center px-0 xl:justify-start xl:px-2.5",
          active
            ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
            : "text-[var(--pf-rail-muted)] hover:bg-[var(--pf-active)] hover:text-[var(--pf-rail-ink)]"
        )}
      >
        <Icon
          className={cn(
            "size-[17px] shrink-0 transition-colors duration-[180ms]",
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

  const navigation = (mobile = false) => (
    <nav className="flex flex-col" aria-label="Workspace navigation">
      {groupLabel("Primary", mobile)}
      <div className="flex flex-col gap-0.5">
        {workspaceNavigationGroups.primary.map((item) => renderItem(item, mobile))}
      </div>
      {groupLabel("Tools", mobile)}
      <div className="flex flex-col gap-0.5">
        {workspaceNavigationGroups.tools.map((item) => renderItem(item, mobile))}
      </div>
    </nav>
  );

  const footer = (mobile = false) => (
    <div className="mt-auto">
      {(notificationPreferences.failures || notificationPreferences.approvals) && (
        <div className={cn("mb-2 gap-1 rounded-[8px] border border-[var(--pf-rail-border)] bg-[var(--pf-active)] p-1", mobile ? "grid" : "sidebar-expanded-only hidden xl:grid")} aria-label="Workspace notifications">
          {notificationPreferences.failures && notificationCounts.generationFailures > 0 && (
            <Link href={notificationCounts.latestFailedJobId ? `/generate/${encodeURIComponent(notificationCounts.latestFailedJobId)}` : "/generate"} onClick={() => mobile && setMobileOpen(false)} className="flex min-w-0 items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11px] text-[var(--pf-rail-muted)] hover:bg-[var(--pf-surface)] hover:text-[var(--pf-rail-ink)]">
              <Bell className="size-3 shrink-0 text-[var(--pf-danger)]" /><span className="min-w-0 flex-1 truncate">Failed generations</span><b className="pf-data">{notificationCounts.generationFailures}</b>
            </Link>
          )}
          {notificationPreferences.approvals && notificationCounts.approvalsWaiting > 0 && (
            <Link href="/gallery?reviewStatus=needs_review" onClick={() => mobile && setMobileOpen(false)} className="flex min-w-0 items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11px] text-[var(--pf-rail-muted)] hover:bg-[var(--pf-surface)] hover:text-[var(--pf-rail-ink)]">
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
        <Link href="/settings?tab=billing" className="font-medium text-[var(--pf-link)] hover:underline">
          Manage
        </Link>
      </div>
      {workspaceNavigationGroups.utility.map((item) => renderItem(item, mobile))}
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
      <div className="fixed inset-x-0 top-0 z-50 flex h-[calc(58px+env(safe-area-inset-top))] items-center border-b border-[var(--pf-rail-border)] bg-[var(--pf-rail)] px-3 pt-[env(safe-area-inset-top)] md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open workspace navigation"
                className="mr-2 size-9 rounded-[8px] text-[var(--pf-rail-muted)] hover:bg-[var(--pf-active)] hover:text-[var(--pf-rail-ink)]"
              />
            }
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 border-[var(--pf-rail-border)] bg-[var(--pf-rail)] p-0">
            <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
            <div className="flex h-full flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
              <PostForgeBrand name={workspaceName} />
              <div className="mt-5 min-h-0 flex-1 overflow-y-auto">{navigation(true)}</div>
              {footer(true)}
            </div>
          </SheetContent>
        </Sheet>
        <PostForgeBrand name={workspaceName} />
        <Link
          href={quickAction.href}
          aria-label={quickAction.label}
          className="ml-auto grid size-9 place-items-center rounded-[8px] bg-[var(--pf-orange)] text-white shadow-[var(--pf-shadow-orange)] transition-[filter,transform] duration-[180ms] hover:brightness-[0.93] active:scale-[0.98]"
        >
          <Plus className="size-4" />
        </Link>
      </div>

      <aside id="workspace-sidebar" className="fixed inset-y-0 left-0 z-40 hidden w-[72px] border-r border-[var(--pf-rail-border)] bg-[var(--pf-rail)] md:flex xl:w-64">
        <div className="sidebar-frame flex w-full flex-col px-2 py-5 xl:px-4">
          <div className="sidebar-header flex min-w-0 items-center justify-between gap-1">
            <PostForgeBrand name={workspaceName} />
            <button
              type="button"
              onClick={() => setDesktopCollapsed((current) => !current)}
              aria-label={desktopCollapsed ? "Expand workspace sidebar" : "Collapse workspace sidebar"}
              aria-expanded={!desktopCollapsed}
              title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden size-7 shrink-0 place-items-center rounded-[6px] text-[var(--pf-rail-muted)] hover:bg-[var(--pf-active)] hover:text-[var(--pf-rail-ink)] xl:grid"
            >
              {desktopCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
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

function PostForgeBrand({ name }: { name: string }) {
  return (
    <Link href="/" className="sidebar-brand flex min-w-0 items-center gap-2.5 px-2" aria-label="PostForge home">
      <span className="grid size-7 shrink-0 place-items-center rounded-[7px] bg-[var(--pf-orange)] text-xs font-bold text-white shadow-[var(--pf-shadow-orange)]">
        P
      </span>
      <span className="sidebar-expanded-only min-w-0 truncate text-[15px] font-bold tracking-[-0.02em] text-[var(--pf-rail-ink)]">{name}</span>
    </Link>
  );
}