import Link from "next/link";
import { ArrowRight, Compass, Copy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceState } from "@/components/workspace-state";

export function HomeStartWork() {
  return (
    <section
      aria-label="Start new work"
      className="mt-3 grid gap-3 sm:grid-cols-3"
    >
      {startActions.map((action) => (
        <Link
          key={action.href}
          prefetch={false}
          href={action.href}
          data-home-start="true"
          className="group flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card p-4 transition-[border-color] duration-[180ms] ease-[var(--pf-ease)] hover:border-[var(--pf-border-strong)]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-[8px] bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
            <action.icon className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-foreground">
              {action.title}
            </span>
            <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
              {action.detail}
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </section>
  );
}


const startActions = [
  {
    href: "/ugc-inspiration",
    icon: Compass,
    title: "Browse inspiration",
    detail: "Pull a source clip from TikTok",
  },
  {
    href: "/ugc-clone",
    icon: Copy,
    title: "Start a clone",
    detail: "Recreate a hook with a linked identity",
  },
  {
    href: "/generate",
    icon: Sparkles,
    title: "Generate an asset",
    detail: "Image or video straight from a prompt",
  },
];

export function HomeEmptyPanel({ className }: { className?: string }) {
  return (
    <WorkspaceState
      tone="empty"
      icon={Compass}
      title="Start today's production loop"
      description="Pull a source from Inspiration or start a Clone when there is no active work to resume."
      action={{ href: "/ugc-inspiration", label: "Return to Inspiration" }}
      secondaryAction={{ href: "/ugc-clone", label: "Start Clone" }}
      className={cn("min-h-[340px]", className)}
    />
  );
}
