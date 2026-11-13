import Link from "next/link";
import type { ReactNode } from "react";
import { SplitMeter } from "@/components/workbench/split-meter";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { formatAge } from "./home-format";
import { HomeSpendBudget } from "./home-spend-budget";
import type { HomeDashboard } from "./home-types";

export function HomeGlanceStats({ dashboard }: { dashboard: HomeDashboard }) {
  const {
    activeJobs,
    activeJobCount = activeJobs.length,
    activeByType,
    pendingReviewCount,
    oldestPendingAt,
    completedThisWeek,
    weekReview,
    todaySummary,
    monthSpend,
    now = new Date(),
  } = dashboard;

  return (
    <section aria-label="Today at a glance" className={STRIP_CLASS}>
      <StatLink href="/jobs?status=active" label="Jobs running" value={activeJobCount} index={0}>
        {activeByType && activeJobCount > 0 ? typeSplit(activeByType) : null}
      </StatLink>
      <StatLink
        href="/gallery?reviewStatus=needs_review"
        label="Awaiting review"
        value={pendingReviewCount}
        index={1}
      >
        {oldestPendingAt ? `Oldest finished ${formatAge(oldestPendingAt, now)}` : null}
      </StatLink>
      <StatLink href="/gallery" label="Completed this week" value={completedThisWeek} index={2}>
        {weekReview ? <ReviewSplit {...weekReview} /> : null}
      </StatLink>
      <StatLink href="/costs" label="Spend today" value={formatCost(todaySummary.totalCost)} index={3}>
        {monthSpend == null ? null : <HomeSpendBudget monthSpend={monthSpend} />}
      </StatLink>
    </section>
  );
}

export const STRIP_CLASS = cn(
  "wb-stat-strip pt-[18px]",
  "max-[1023px]:grid max-[1023px]:grid-cols-2 max-[1023px]:px-5"
);

/**
 * Below 1024 the four stats sit two by two and the hairlines form one cross: the rows touch, so the
 * second column's left edge and the second row's top edge each run unbroken. The cells
 * have square corners at every width, since a radius curls the ends of a one-sided border.
 */
/**
 * The focus ring is drawn 12px around the stat's content, not on the cell: the cells have no radius
 * and the outer ones no side padding, so a ring on the cell would sit tight on the label.
 */
const STAT_BODY =
  "relative flex min-w-0 flex-col gap-0.5 after:pointer-events-none after:absolute after:-inset-3 after:rounded-[8px] after:opacity-0 after:shadow-[inset_0_0_0_2px_var(--pf-ember)] group-focus-visible:after:opacity-100";

export const GRID_CELL = [
  "max-[1023px]:pr-4 max-[1023px]:pb-4",
  "max-[1023px]:pl-4 max-[1023px]:pr-0 max-[1023px]:pb-4",
  "max-[1023px]:border-l-0 max-[1023px]:pl-0 max-[1023px]:pr-4 max-[1023px]:border-t max-[1023px]:border-hairline max-[1023px]:pt-4",
  "max-[1023px]:pl-4 max-[1023px]:border-t max-[1023px]:border-hairline max-[1023px]:pt-4",
];

function StatLink({
  href,
  label,
  value,
  index,
  children,
}: {
  href: string;
  label: string;
  value: ReactNode;
  index: number;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn("wb-stat group outline-none", GRID_CELL[index])}>
      <span className={STAT_BODY}>
        <span className="wb-label transition-colors duration-[var(--pf-dur-feedback)] ease-pf group-hover:text-fg-secondary">
          {label}
        </span>
        <span className="wb-stat-value">{value}</span>
        {children ? <span className="wb-stat-foot">{children}</span> : null}
      </span>
    </Link>
  );
}

function typeSplit({ video, image }: { video: number; image: number }) {
  const parts = [
    video > 0 ? `${video} ${video === 1 ? "video" : "videos"}` : null,
    image > 0 ? `${image} ${image === 1 ? "image" : "images"}` : null,
  ].filter(Boolean);
  return parts.join(", ");
}

function ReviewSplit({ approved, rejected }: { approved: number; rejected: number }) {
  const label = `${approved} approved, ${rejected} rejected`;
  return (
    <>
      <span className="wb-mono text-ok">{approved}</span>
      <SplitMeter
        label={label}
        parts={
          approved + rejected === 0
            ? [{ value: 1, tone: "empty" }]
            : [
                { value: approved, tone: "ok" as const, label: `${approved} approved` },
                { value: rejected, tone: "bad" as const, label: `${rejected} rejected` },
              ].filter((part) => part.value > 0)
        }
      />
      <span className="wb-mono text-bad">{rejected}</span>
    </>
  );
}
