import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { iconButtonClass } from "./icon-button";

type PageHeaderProps = {
  title: ReactNode;
  /** Renders the 40px round back button before the title. */
  back?: { href: string; label: string };
  /** Actions slot: at most the one bone primary plus one quiet secondary. */
  children?: ReactNode;
  className?: string;
  id?: string;
};

/** Page header: the title only, no description line. */
export function PageHeader({ title, back, children, className, id }: PageHeaderProps) {
  return (
    <header
      id={id}
      className={cn("wb-page-header", className)}
      data-back={back ? "true" : undefined}
    >
      <div className="wb-page-header-lead">
        {back && (
          <Link
            href={back.href}
            aria-label={back.label}
            title={back.label}
            className={iconButtonClass("quiet", 40)}
          >
            <Icon name="chevron-left" />
          </Link>
        )}
        <h1 className="wb-page-title">{title}</h1>
      </div>
      {children && <div className="wb-page-actions">{children}</div>}
    </header>
  );
}
