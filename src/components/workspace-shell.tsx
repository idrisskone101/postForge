"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  getActiveWorkspaceItem,
  workspaceNavigationGroups,
} from "@/lib/workspace-navigation";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeItem =
    getActiveWorkspaceItem(pathname) ?? workspaceNavigationGroups.primary[0];

  return (
    <main className="min-h-screen overflow-auto md:ml-72">
      <div className="border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-4 pl-16 sm:px-6 sm:pl-16 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:pl-8">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              Workspace
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              {activeItem.label}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {activeItem.description}
            </p>
          </div>

          <Link
            href={activeItem.primaryAction.href}
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-accent-coral px-4 text-sm font-semibold text-white transition-colors hover:bg-[#ff6540]"
          >
            {activeItem.primaryAction.label}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      {children}
    </main>
  );
}
