import type { ComponentProps } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader as ShadcnCardHeader,
} from "@/components/ui/card";
import type { HomeLaneEmptyProps, HomePanelHeaderProps, HomePanelLinkProps } from "./home-types";

export function HomePanel({
  className,
  children,
  ...props
}: ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "min-w-0 gap-0 overflow-visible rounded-lg border border-border bg-card py-4 text-card-foreground shadow-none ring-0 sm:py-5",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

export function HomePanelHeader({ title, action }: HomePanelHeaderProps) {
  return (
    <ShadcnCardHeader className="items-center gap-3 rounded-t-lg px-4 pb-0 pt-0 sm:px-5">
      <h3 className="pf-section-title truncate">{title}</h3>
      {action ? <CardAction>{action}</CardAction> : null}
    </ShadcnCardHeader>
  );
}

export function HomePanelLink({ href, children }: HomePanelLinkProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function HomePanelBody({
  className,
  children,
  ...props
}: ComponentProps<typeof CardContent>) {
  return (
    <CardContent className={cn("px-4 pt-3 pb-0 sm:px-5", className)} {...props}>
      {children}
    </CardContent>
  );
}

export function HomeLaneEmpty({
  icon: Icon,
  title,
  description,
  iconTone = "muted",
  className,
}: HomeLaneEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-6 text-center",
        className
      )}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-full bg-muted",
          iconTone === "success" ? "text-[var(--pf-success)]" : "text-muted-foreground"
        )}
      >
        <Icon className="size-4" />
      </span>
      <p className="mt-2 text-[13px] font-medium text-foreground">{title}</p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
    </div>
  );
}
