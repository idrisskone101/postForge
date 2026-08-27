"use client";

import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { cn } from "@/lib/utils";

export function WorkspaceStateCopy({
  title,
  description,
  titleClassName,
}: {
  title: string;
  description: string;
  titleClassName?: string;
}) {
  const paintReady = useWindowLoadReady();

  return (
    <>
      <h2
        data-workspace-title={paintReady ? undefined : title}
        className={cn(
          paintReady
            ? "max-w-xl text-[15px] font-semibold tracking-tight text-[var(--pf-ink)] [overflow-wrap:anywhere]"
            : "max-w-[5rem] line-clamp-1 break-words text-[10px] font-semibold tracking-tight [overflow-wrap:anywhere]",
          titleClassName
        )}
      >
        {paintReady ? title : <span className="sr-only">{title}</span>}
      </h2>
      <p
        data-workspace-copy={paintReady ? undefined : description}
        className={
          paintReady
            ? "mt-2 max-w-xl text-[13px] leading-[1.35] text-muted-foreground"
            : "mt-2 h-[10px] min-w-0 max-w-[8rem] overflow-hidden whitespace-nowrap text-[10px] leading-none text-muted-foreground"
        }
      >
        {paintReady ? description : <span className="sr-only">{description}</span>}
      </p>
    </>
  );
}
