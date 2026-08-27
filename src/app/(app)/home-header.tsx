import Link from "next/link";

export function HomeHeader({ now = new Date() }: { now?: Date }) {
  const TITLE = "Home";
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <header className="flex flex-nowrap items-end justify-between gap-3 pt-7">
      <div className="min-w-0">
        <h1 data-home-title={TITLE}>
          <span className="sr-only">{TITLE}</span>
        </h1>
        <p
          data-home-copy={todayLabel}
          className="mt-1 line-clamp-1 max-w-[8rem] text-[10px] leading-none text-muted-foreground"
        >
          <span className="sr-only">{todayLabel}</span>
        </p>
      </div>
      <Link
        href="/ugc-clone"
        prefetch={false}
        data-home-action="New Clone"
        className="pf-button-primary shrink-0"
      >
        <span className="sr-only">New Clone</span>
      </Link>
    </header>
  );
}
