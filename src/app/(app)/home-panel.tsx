import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CardHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <h3 className="pf-section-title truncate">{title}</h3>
      {action}
    </div>
  );
}

export function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[var(--pf-muted)] transition-colors hover:text-[var(--pf-ink)]"
    >
      {children}
      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
