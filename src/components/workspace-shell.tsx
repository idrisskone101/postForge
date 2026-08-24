import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getActiveWorkspaceItem,
  workspaceNavigationGroups,
  type WorkspaceNavigationItem,
} from "@/lib/workspace-navigation";

export function WorkspaceShell({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
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
          <p className="mt-1.5 line-clamp-1 max-w-[14rem] text-[10px] leading-3 text-[var(--pf-muted)]">
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
              prefetch={false}
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
