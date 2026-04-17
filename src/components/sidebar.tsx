"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  Image,
  PieChart,
  Menu,
  Rocket,
  Users,
  Compass,
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

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    hoverColor: "hover:bg-accent-blue/10 hover:text-accent-blue",
    activeColor: "bg-accent-blue/10 text-accent-blue",
  },
  {
    label: "Launch Forge",
    href: "/generate",
    icon: Sparkles,
    shortcut: "\u2318K",
    hoverColor: "hover:bg-accent-coral/10 hover:text-accent-coral",
    activeColor: "bg-accent-coral/10 text-accent-coral",
  },
  {
    label: "Gallery",
    href: "/gallery",
    icon: Image,
    hoverColor: "hover:bg-accent-green/10 hover:text-accent-green",
    activeColor: "bg-accent-green/10 text-accent-green",
  },
  {
    label: "UGC Clone",
    href: "/ugc-clone",
    icon: Users,
    hoverColor: "hover:bg-accent-green/10 hover:text-accent-green",
    activeColor: "bg-accent-green/10 text-accent-green",
  },
  {
    label: "UGC Inspiration",
    href: "/ugc-inspiration",
    icon: Compass,
    hoverColor: "hover:bg-accent-blue/10 hover:text-accent-blue",
    activeColor: "bg-accent-blue/10 text-accent-blue",
  },
  {
    label: "Analytics",
    href: "/costs",
    icon: PieChart,
    hoverColor: "hover:bg-accent-blue/10 hover:text-accent-blue",
    activeColor: "bg-accent-blue/10 text-accent-blue",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const mobileNavContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="w-9 h-9 rounded-xl bg-accent-coral flex items-center justify-center text-white">
          <Rocket className="size-5" />
        </div>
        <span className="text-sm font-semibold tracking-tight">PostForge</span>
      </div>
      <nav className="flex flex-col gap-1 px-3 mt-4 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-blue/15 text-accent-blue"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="size-5" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
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
      <div className="fixed top-3 left-3 z-50 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
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

      {/* Desktop: Pill-shaped icon sidebar */}
      <nav className="hidden md:flex w-24 fixed left-0 top-0 bottom-0 flex-col items-center py-8 z-40">
        <div className="bg-card/80 backdrop-blur-xl border border-border w-20 h-full rounded-[40px] shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex flex-col items-center py-6">
          {/* Logo */}
          <div className="w-12 h-12 rounded-[20px] bg-accent-coral flex items-center justify-center text-white mb-10 shadow-[0_8px_20px_rgba(255,122,89,0.3)] hover:scale-110 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer">
            <Rocket className="size-6" />
          </div>

          {/* Nav Items */}
          <div className="flex flex-col gap-6 w-full items-center">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative w-12 h-12 rounded-[20px] flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110",
                    active
                      ? item.activeColor
                      : cn("text-muted-foreground", item.hoverColor)
                  )}
                >
                  <Icon className="size-6" />
                  {/* Tooltip */}
                  <div className="absolute left-16 bg-foreground text-background text-xs px-4 py-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-lg font-medium pointer-events-none">
                    {item.label}
                    {item.shortcut && (
                      <span className="ml-2 opacity-60">{item.shortcut}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Bottom: Theme toggle + avatar */}
          <div className="mt-auto flex flex-col gap-4 items-center">
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </>
  );
}
