import { cn } from "@/lib/utils";

export function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "success" | "danger";
}) {
  return (
    <article className="pf-card p-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <div className="mt-2 flex items-center justify-between">
        <b
          className={cn(
            "text-[20px] font-semibold tracking-[-0.02em]",
            tone === "danger" && "text-[var(--pf-danger)]"
          )}
        >
          {value}
        </b>
        {tone && (
          <i
            className={cn(
              "size-2 rounded-full",
              tone === "success" ? "bg-[var(--pf-success)]" : "bg-[var(--pf-danger)]"
            )}
          />
        )}
      </div>
      <small className="mt-1 block text-[12px] text-muted-foreground">
        {detail}
      </small>
    </article>
  );
}
