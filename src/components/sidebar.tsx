"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Sparkles,
  Image,
  Menu,
  Rocket,
  Users,
  Compass,
  DollarSign,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
} from "@/lib/workspace-navigation";

const NAV_ICONS: Record<
  WorkspaceNavigationItem["label"],
  ComponentType<{ className?: string }>
> = {
  Home: LayoutDashboard,
  Inspiration: Compass,
  Clone: Users,
  Gallery: Image,
  Spend: DollarSign,
  Generate: Sparkles,
};

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem = getActiveWorkspaceItem(pathname);

  const isActive = (item: WorkspaceNavigationItem) => {
    return activeItem?.href === item.href;
  };

  const renderNavGroup = (
    items: readonly WorkspaceNavigationItem[],
    options?: { heading?: string; mobile?: boolean }
  ) => (
    <div className={cn("flex flex-col gap-1", options?.mobile && "px-3")}>
      {options?.heading && (
        <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase text-muted-foreground">
          {options.heading}
        </p>
      )}
      {items.map((item) => {
        const Icon = NAV_ICONS[item.label];
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => options?.mobile && setMobileOpen(false)}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? options?.mobile
                  ? "bg-accent-coral/12 text-accent-coral"
                  : "bg-white/5 text-white ring-1 ring-accent-green/40"
                : options?.mobile
                  ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
            )}
          >
            {options?.mobile ? (
              <Icon className="size-4 shrink-0" />
            ) : (
              <span
                className={cn(
                  "size-4 shrink-0 rounded-sm",
                  item.label === "Home" && "bg-accent-blue",
                  item.label === "Inspiration" && "bg-accent-blue",
                  item.label === "Clone" && "bg-accent-green",
                  item.label === "Gallery" && "bg-accent-coral",
                  item.label === "Spend" && "bg-white/40",
                  item.label === "Generate" && "bg-white/20"
                )}
              />
            )}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  const mobileNavContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-accent-coral text-white">
          <Rocket className="size-5" />
        </div>
        <span className="text-sm font-semibold">PostForge</span>
      </div>
      <nav className="mt-2 flex flex-1 flex-col gap-3">
        {renderNavGroup(workspaceNavigationGroups.primary, { mobile: true })}
        {renderNavGroup(workspaceNavigationGroups.tools, {
          heading: "Tools",
          mobile: true,
        })}
      </nav>
      <div className="px-3 py-4">
        <ThemeToggle />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: Sheet */}
      <div className="fixed left-3 top-3 z-50 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open workspace navigation"
                className="text-muted-foreground hover:text-foreground"
              />
            }
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {mobileNavContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: labelled workspace sidebar */}
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-[248px] border-r border-white/10 bg-[oklch(0.18_0_0)] md:flex">
        <div className="flex w-full flex-col px-4 py-5">
          <Link href="/" className="mb-6 flex items-center gap-3 px-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent-coral text-sm font-bold text-white">
              P
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">PostForge</p>
              <p className="text-[11px] leading-tight text-white/50">UGC workspace</p>
            </div>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {renderNavGroup([workspaceNavigationGroups.primary[0]])}
            {renderNavGroup(workspaceNavigationGroups.primary.slice(1), {
              heading: "Daily Production Loop",
            })}
            <div>
              {renderNavGroup(workspaceNavigationGroups.tools, {
                heading: "Tools",
              })}
            </div>
          </nav>

          <div className="mt-auto">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[11px] font-semibold text-white/60">Daily Usage</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-semibold">$4.82</span>
                <span className="text-[11px] text-white/45">spend</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 px-2">
              <div className="size-8 overflow-hidden rounded-full bg-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                  alt=""
                  className="size-full"
                />
              </div>
              <div className="text-xs font-medium text-white/70">Felix Studio</div>
              <button
                type="button"
                className="ml-auto text-white/40 transition-colors hover:text-white"
                aria-label="Settings"
              >
                <Settings className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
