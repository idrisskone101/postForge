import { Webhook } from "lucide-react";

export function DeveloperSettingsPanel() {
  return (
    <div data-developer-settings-panel="webhooks">
      <span className="grid size-10 place-items-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
        <Webhook className="size-4" />
      </span>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">Webhooks</h2>
          <p className="mt-1 max-w-[620px] text-[11px] leading-4 text-muted-foreground">
            Deliver signed workflow events only after endpoint validation, secret storage, retries, and delivery logs exist.
          </p>
        </div>
        <span className="rounded-full border border-border bg-[var(--pf-active)] px-2.5 py-1 text-[12px] font-bold text-muted-foreground">
          NOT CONFIGURED
        </span>
      </div>
      <div className="pf-card mt-6 max-w-[720px] p-5">
        <div className="rounded-lg border border-dashed border-[var(--pf-border-strong)] bg-card px-5 py-8 text-center">
          <Webhook className="mx-auto size-6 text-muted-foreground" />
          <h3 className="mt-3 text-[13px] font-semibold">No webhook endpoints are registered</h3>
          <p className="mx-auto mt-2 max-w-[480px] text-[11px] leading-4 text-muted-foreground">
            No events are being delivered. PostForge will not claim a webhook is active until a server-owned signing and retry pipeline is configured.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 h-9 rounded-lg bg-[var(--pf-active)] px-4 text-[13px] font-semibold text-muted-foreground disabled:cursor-not-allowed"
          >
            Webhook delivery not configured
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(
            [
              ["Signed events", "Server-owned signing secret"],
              ["Reliable delivery", "Retries and failure handling"],
              ["Delivery history", "Status and response audit log"],
            ] as const
          ).map(([title, detail]) => (
            <div key={title} className="rounded-lg border border-border bg-card p-3">
              <b className="block text-[11px]">{title}</b>
              <span className="mt-1 block text-[12px] leading-4 text-muted-foreground">{detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
