import Link from "next/link";
import { formatCost } from "@/lib/utils/format-cost";

export function HomeGlanceStats({
  todayCost,
  activeJobCount,
  pendingReviewCount,
  completedThisWeek,
}: {
  todayCost: number;
  activeJobCount: number;
  pendingReviewCount: number;
  completedThisWeek: number;
}) {
  return (
    <section
      data-home-glance="true"
      aria-label="Today at a glance"
      className="mt-6 grid grid-cols-2 gap-3 min-[860px]:!grid-cols-4"
    >
      <StatCard
        href="/costs"
        label="Spend today"
        value={formatCost(todayCost)}
      />
      <StatCard
        href="/jobs?status=active"
        label="Jobs running"
        value={String(activeJobCount)}
      />
      <StatCard
        href="/gallery?reviewStatus=needs_review"
        label="Awaiting review"
        value={String(pendingReviewCount)}
      />
      <StatCard
        href="/gallery"
        label="Completed this week"
        value={String(completedThisWeek)}
      />
    </section>
  );
}


function StatCard({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-card px-4 py-4 transition-[border-color] duration-[180ms] ease-[var(--pf-ease)] hover:border-[var(--pf-border-strong)]"
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" data-home-glance-label={label} />
      <span className="text-[28px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-foreground">
        {value}
      </span>
    </Link>
  );
}
