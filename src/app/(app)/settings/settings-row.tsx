import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A settings line: 14/600 label with an optional 13px muted detail on the
 * left, the control on the right. Hairline above, 18px vertical padding.
 * Stacks below 640px.
 */
export function SettingsRow({
  label,
  detail,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  detail?: ReactNode;
  htmlFor?: string;
  children?: ReactNode;
  className?: string;
}) {
  const Label = htmlFor ? "label" : "span";
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-hairline py-[18px] sm:flex-row sm:items-center sm:gap-6",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Label htmlFor={htmlFor} className="text-sm font-semibold leading-[18px] text-fg">
          {label}
        </Label>
        {detail && (
          <span className="break-words text-[13px] leading-4 text-fg-muted [overflow-wrap:anywhere]">
            {detail}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function PanelFoot({ children }: { children: ReactNode }) {
  return <div className="wb-panel-foot">{children}</div>;
}
