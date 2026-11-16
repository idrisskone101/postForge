import Link from "next/link";
import type { ReactNode } from "react";

type PolicySection = {
  id: string;
  title: string;
  content: ReactNode;
};

type PolicyPath = (typeof policyLinks)[number]["href"];

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
  currentPath: PolicyPath;
  sections: PolicySection[];
}) {
  return (
    <PolicyFrame currentPath={currentPath}>
      <header className="policy-intro">
        <h1 className="policy-heading" data-policy-title={title}>
          {title}
        </h1>
        <p className="policy-summary" data-policy-summary={summary}>
          {summary}
        </p>
        <p className="policy-effective">
          Effective <time dateTime="2026-08-09">{effectiveDate}</time>
        </p>
      </header>
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="policy-section">
          <h2 className="policy-sectionTitle">{section.title}</h2>
          <div className="policy-copy">{section.content}</div>
        </section>
      ))}
    </PolicyFrame>
  );
}

/** Public reading frame: mark linking home, one 68ch column, hairline footer. */
export function PolicyFrame({
  currentPath,
  children,
}: {
  currentPath?: PolicyPath;
  children: ReactNode;
}) {
  return (
    <div data-public-policy className="policy-page">
      <a href="#policy-content" className="policy-skip">
        Skip to content
      </a>
      <header className="policy-topBar">
        {/* prefetch-off: a public reading page should not warm the workspace bundle. */}
        <Link href="/" prefetch={false} className="policy-brand">
          <span aria-hidden="true" className="policy-mark">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 20V5h7a4 4 0 0 1 0 8H7" />
            </svg>
          </span>
          PostForge
        </Link>
      </header>

      <main id="policy-content" className="policy-main">
        {children}
      </main>

      <footer className="policy-footer">
        <span>
          Support:{" "}
          <a href="mailto:idriss.kone@icloud.com">idriss.kone@icloud.com</a>
        </span>
        <nav aria-label="Policy pages" className="policy-footerLinks">
          {policyLinks.map((link) => (
            // prefetch-off: static policy pages, plain navigation is enough.
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              aria-current={currentPath === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}

const policyLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/data-deletion", label: "Data deletion" },
] as const;
