import Link from "next/link";
import type { ReactNode } from "react";

type PolicySection = {
  id: string;
  title: string;
  content: ReactNode;
};

export function PublicPolicyPage({
  title,
  summary,
  effectiveDate,
  currentPath,
  sections,
}: {
  title: string;
  summary: string;
  effectiveDate: string;
  currentPath: (typeof policyLinks)[number]["href"];
  sections: PolicySection[];
}) {
  return (
    <div data-public-policy className="min-h-dvh bg-[var(--pf-canvas)] text-[var(--pf-ink)]">
      <a
        href="#policy-content"
        className="sr-only z-50 rounded-lg bg-[var(--pf-ink)] px-4 py-2 text-sm font-semibold text-[var(--pf-canvas)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to policy
      </a>

      <header className="border-b border-[var(--pf-border)] bg-[var(--pf-surface)]">
        <div className="mx-auto flex min-h-16 max-w-[1120px] items-center justify-between gap-5 px-5 sm:px-7 lg:px-8">
          <Link href="/privacy" prefetch={false} className="flex items-center gap-2.5">
            <span aria-hidden="true" className="grid size-7 place-items-center rounded-[7px] bg-[var(--pf-orange)] text-xs font-bold text-white shadow-[var(--pf-shadow-orange)]">
              P
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em]">PostForge</span>
          </Link>
          <nav aria-label="Policy pages" className="flex items-center gap-1 text-[12px] font-semibold text-[var(--pf-muted)] sm:gap-2">
            {policyLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                aria-current={currentPath === link.href ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg px-2.5 py-2 hover:bg-[var(--pf-active)] hover:text-[var(--pf-ink)] ${currentPath === link.href ? "bg-[var(--pf-active)] text-[var(--pf-ink)]" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main id="policy-content" className="mx-auto max-w-[1120px] px-5 py-10 sm:px-7 sm:py-14 lg:px-8 lg:py-16">
        <header className="max-w-[760px] border-b border-[var(--pf-border)] pb-8 sm:pb-10">
          <h1 className="max-w-[8ch] text-[3.5rem] font-semibold leading-[0.9] tracking-[-0.05em]">
            {title}
          </h1>
          <p className="mt-4 line-clamp-1 max-w-[16rem] text-[12px] leading-4 text-[var(--pf-muted)]">
            {summary}
          </p>
          <p className="mt-5 text-[12px] font-medium text-[var(--pf-muted)]">
            Effective <time dateTime="2026-08-09">{effectiveDate}</time>
          </p>
        </header>

        <div className="mt-9 grid min-w-0 gap-10 lg:grid-cols-[210px_minmax(0,720px)] lg:gap-14">
          <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
            <p className="text-[12px] font-semibold text-[var(--pf-ink)]">On this page</p>
            <nav aria-label={`${title} sections`} className="mt-2 flex w-full max-w-full gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2.5 py-2 text-[12px] leading-4 text-[var(--pf-muted)] hover:bg-[var(--pf-active)] hover:text-[var(--pf-ink)] lg:whitespace-normal"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <article className="min-w-0">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className={
                  index === 0
                    ? "scroll-mt-8"
                    : "mt-10 scroll-mt-8 border-t border-[var(--pf-border)] pt-10 [content-visibility:auto] [contain-intrinsic-size:auto_8rem]"
                }
              >
                <h2 className="text-[20px] font-semibold leading-6 tracking-[-0.02em]">{section.title}</h2>
                <div className="policy-copy mt-3 max-w-[36ch] text-[12px] leading-4 text-[var(--pf-muted)]">
                  {section.content}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>

      <footer className="border-t border-[var(--pf-border)] bg-[var(--pf-surface)]">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-5 py-6 text-[12px] text-[var(--pf-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-8">
          <span>
            Support: <a className="font-semibold hover:text-[var(--pf-ink)]" href="mailto:idriss.kone@icloud.com">idriss.kone@icloud.com</a>
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-2 font-semibold">
            {policyLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                aria-current={currentPath === link.href ? "page" : undefined}
                className={currentPath === link.href ? "text-[var(--pf-ink)] underline underline-offset-4" : "hover:text-[var(--pf-ink)]"}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}


const policyLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/data-deletion", label: "Data deletion" },
] as const;