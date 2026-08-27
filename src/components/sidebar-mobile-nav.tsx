"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";

type QuickAction = {
  href: string;
  label: string;
};

export function SidebarMobileNav({
  brand,
  quickAction,
  children,
}: {
  brand: ReactNode;
  quickAction: QuickAction;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div
      id="workspace-mobile-bar"
      className="fixed inset-x-0 top-0 z-50 flex h-[calc(58px+env(safe-area-inset-top))] items-center border-b border-[var(--pf-rail-border)] bg-[var(--pf-rail)] px-3 pt-[env(safe-area-inset-top)] md:hidden"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Open workspace navigation"
        className="mr-2 size-9 rounded-[8px] text-[var(--pf-rail-muted)] hover:bg-[var(--pf-active)] hover:text-[var(--pf-rail-ink)]"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        side="left"
        id="workspace-mobile-drawer"
        ariaLabel="Workspace navigation"
        className="sidebar-mobile-drawer z-[60] bg-[var(--pf-rail)] shadow-none"
        backdropClassName="z-[60] bg-black/40"
      >
        <div className="flex h-full flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
          {brand}
          {children(close)}
        </div>
      </Drawer>
      {brand}
      <Link
        href={quickAction.href}
        aria-label={quickAction.label}
        className="t-press ml-auto grid size-9 place-items-center rounded-[8px] bg-[var(--pf-orange)] text-white shadow-[var(--pf-shadow-orange)] transition-[filter] duration-[var(--pf-duration)] ease-[var(--pf-ease)] hover:brightness-[0.93]"
      >
        <Plus className="size-4" />
      </Link>
    </div>
  );
}
