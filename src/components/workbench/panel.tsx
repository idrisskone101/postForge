import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  /** Panel title, 16/700. Omit for an untitled panel. */
  title?: ReactNode;
  /** The one optional trailing control in the title row. */
  action?: ReactNode;
  /** default 18/20/20, wide 18/24/20, roomy 24, tight 12, none 0 */
  pad?: "default" | "wide" | "roomy" | "tight" | "none";
};

/** 16px panel on the floor. No border, no caption line. */
export function Panel({
  title,
  action,
  pad = "default",
  className,
  children,
  ...rest
}: PanelProps) {
  return (
    <section
      className={cn("wb-panel", className)}
      data-pad={pad === "default" ? undefined : pad}
      {...rest}
    >
      {(title || action) && (
        <div className="wb-panel-head">
          {title ? <h2 className="wb-panel-title">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
