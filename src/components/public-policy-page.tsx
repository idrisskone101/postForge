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
    <div data-public-policy className="policy-page">
      <a href="#policy-content" className="policy-skip">
        Skip to policy
      </a>

      <header className="policy-topBar">
        <div className="policy-topBarInner">
          <Link href="/privacy" prefetch={false} className="policy-brand">
            <span aria-hidden="true" className="policy-mark">
              P
            </span>
            <span className="policy-brandName">PostForge</span>
          </Link>
          <nav aria-label="Policy pages" className="policy-topNav">
            {policyLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                aria-current={currentPath === link.href ? "page" : undefined}
                className={currentPath === link.href ? "policy-topLink policy-topLinkCurrent" : "policy-topLink"}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main id="policy-content" className="policy-main">
        <header className="policy-titleBlock">
          <h1 className="policy-heading" data-policy-title={title}>
            <span className="sr-only">{title}</span>
          </h1>
          <p className="policy-summary" data-policy-summary={summary}>
            <span className="sr-only">{summary}</span>
          </p>
          <p className="policy-effective">
            Effective <time dateTime="2026-08-09">{effectiveDate}</time>
          </p>
        </header>

        <div className="policy-columns">
          <aside className="policy-aside">
            <p className="policy-asideLabel">On this page</p>
            <nav aria-label={`${title} sections`} className="policy-sectionNav">
              {sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="policy-sectionLink">
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <article className="policy-article">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className={index === 0 ? "policy-section" : "policy-sectionLater"}
              >
                <h2 className="policy-sectionTitle">{section.title}</h2>
                <div className="policy-copy">{section.content}</div>
              </section>
            ))}
          </article>
        </div>
      </main>

      <footer className="policy-footer">
        <div className="policy-footerInner">
          <span>
            Support:{" "}
            <a href="mailto:idriss.kone@icloud.com">idriss.kone@icloud.com</a>
          </span>
          <div className="policy-footerLinks">
            {policyLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                aria-current={currentPath === link.href ? "page" : undefined}
                className={currentPath === link.href ? "policy-footerLinkCurrent" : undefined}
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
