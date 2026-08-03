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
  GalleryHorizontal,
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
  Slideshow: GalleryHorizontal,
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
                ? "bg-accent-coral/12 text-accent-coral"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
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
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-72 border-r border-border bg-card/80 backdrop-blur-xl md:flex">
        <div className="flex w-full flex-col px-4 py-5">
          <Link href="/" className="mb-8 flex items-center gap-3 px-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-accent-coral text-white shadow-[0_8px_20px_rgba(255,122,89,0.2)]">
              <Rocket className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">PostForge</p>
              <p className="text-xs text-muted-foreground">UGC workspace</p>
            </div>
          </Link>

          <nav className="flex flex-1 flex-col gap-4">
            {renderNavGroup(workspaceNavigationGroups.primary)}
            <div className="mt-2 border-t border-border pt-2">
              {renderNavGroup(workspaceNavigationGroups.tools, {
                heading: "Tools",
              })}
            </div>
          </nav>

          <div className="mt-auto flex items-center justify-between border-t border-border px-2 pt-4">
            <span className="text-xs font-medium text-muted-foreground">
              Theme
            </span>
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
}
